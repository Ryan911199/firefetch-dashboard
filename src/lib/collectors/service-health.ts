/**
 * Service Health Collection
 * 
 * Internal health checks for services using internal URLs.
 */

import fs from 'fs';
import { type ServiceSnapshot, addNotification } from '../database';
import { sendPushoverNotification, PushoverPriority } from '../pushover';

// Service configuration interface
export interface ServiceConfig {
  name: string;
  subdomain: string;
  url: string;
  internal_url?: string;
  internal_port: number;
  description: string;
  internal_only?: boolean;
}

// 3-strike notification system for INTERNAL health checks
const serviceFailureCount: Map<string, number> = new Map();
const FAILURE_THRESHOLD = 3;
const RETRY_DELAY = 15000;

// Track previous status for notifications
const prevServiceStatus: Map<string, string> = new Map();

export async function loadServicesConfig(): Promise<ServiceConfig[]> {
  try {
    const configPaths = [
      process.env.SERVICES_CONFIG_PATH,
      '/app/config/services.json',
      '/home/ubuntu/ai/infrastructure/services.json',
    ].filter(Boolean) as string[];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return data.services || [];
      }
    }

    console.warn('No services config found in any path');
    return [];
  } catch (error) {
    console.error('Failed to load services config:', error);
    return [];
  }
}

/**
 * Get the internal URL for a service
 */
function getInternalUrl(service: ServiceConfig): string {
  if (service.internal_url) {
    return service.internal_url;
  }

  const isDocker = process.env.DOCKER_ENV === 'true' ||
    fs.existsSync('/.dockerenv');

  const host = isDocker ? 'host.docker.internal' : 'localhost';

  return `http://${host}:${service.internal_port}`;
}

async function checkServiceHealth(service: ServiceConfig): Promise<ServiceSnapshot> {
  const timestamp = Date.now();
  let status: 'online' | 'offline' | 'degraded' = 'offline';
  let responseTime: number | undefined;

  const checkUrl = getInternalUrl(service);

  try {
    const startTime = Date.now();
    const response = await fetch(checkUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    responseTime = Date.now() - startTime;

    if (response.ok || response.status === 301 || response.status === 302 || response.status === 401 || response.status === 405) {
      status = responseTime > 2000 ? 'degraded' : 'online';
    } else if (response.status >= 500) {
      status = 'offline';
    } else {
      status = 'online';
    }
  } catch {
    status = 'offline';
  }

  return {
    timestamp,
    service_id: service.subdomain,
    service_name: service.name,
    status,
    response_time: responseTime,
  };
}

async function handleServiceOffline(service: ServiceConfig, result: ServiceSnapshot): Promise<void> {
  const prevStatus = prevServiceStatus.get(service.subdomain);

  if (prevStatus !== 'offline') {
    console.log(`[Health] ${service.name} confirmed OFFLINE after ${FAILURE_THRESHOLD} checks`);

    const notification = {
      timestamp: Date.now(),
      type: 'error' as const,
      title: 'Service Offline',
      message: `${service.name} is now offline (failed ${FAILURE_THRESHOLD} consecutive checks)`,
      service_id: service.subdomain,
    };
    addNotification(notification);
    await sendPushoverNotification({
      title: `🔴 ${notification.title}`,
      message: notification.message,
      priority: PushoverPriority.HIGH,
      url: `https://${service.subdomain}.firefetch.org`,
      url_title: 'View Service',
    });

    prevServiceStatus.set(service.subdomain, 'offline');
  }
}

async function handleServiceRecovered(service: ServiceConfig, result: ServiceSnapshot): Promise<void> {
  console.log(`[Health] ${service.name} recovered`);

  const notification = {
    timestamp: Date.now(),
    type: 'success' as const,
    title: 'Service Recovered',
    message: `${service.name} is back online`,
    service_id: service.subdomain,
  };
  addNotification(notification);
  await sendPushoverNotification({
    title: `🟢 ${notification.title}`,
    message: notification.message,
    priority: PushoverPriority.NORMAL,
  });

  prevServiceStatus.set(service.subdomain, 'online');
}

export async function checkServiceWithRetry(
  service: ServiceConfig,
  onStatusUpdate?: (serviceId: string, status: ServiceSnapshot) => void
): Promise<ServiceSnapshot> {
  const result = await checkServiceHealth(service);

  if (result.status === 'offline') {
    const currentFailures = serviceFailureCount.get(service.subdomain) || 0;
    serviceFailureCount.set(service.subdomain, currentFailures + 1);

    if (currentFailures + 1 < FAILURE_THRESHOLD) {
      console.log(`[Health] ${service.name} failed (${currentFailures + 1}/${FAILURE_THRESHOLD}), will recheck in ${RETRY_DELAY / 1000}s`);

      setTimeout(async () => {
        const retryResult = await checkServiceHealth(service);
        if (retryResult.status === 'offline') {
          const newFailures = (serviceFailureCount.get(service.subdomain) || 0) + 1;
          serviceFailureCount.set(service.subdomain, newFailures);

          if (newFailures >= FAILURE_THRESHOLD) {
            await handleServiceOffline(service, retryResult);
          } else {
            console.log(`[Health] ${service.name} retry failed (${newFailures}/${FAILURE_THRESHOLD})`);
          }
        } else {
          console.log(`[Health] ${service.name} recovered on retry`);
          serviceFailureCount.set(service.subdomain, 0);
          if (onStatusUpdate) {
            onStatusUpdate(service.subdomain, retryResult);
          }
        }
      }, RETRY_DELAY);
    } else {
      await handleServiceOffline(service, result);
    }
  } else {
    const wasOffline = serviceFailureCount.get(service.subdomain) || 0;
    if (wasOffline >= FAILURE_THRESHOLD) {
      await handleServiceRecovered(service, result);
    }
    serviceFailureCount.set(service.subdomain, 0);
  }

  return result;
}

export function getPrevServiceStatus(serviceId: string): string | undefined {
  return prevServiceStatus.get(serviceId);
}

export function setPrevServiceStatus(serviceId: string, status: string): void {
  prevServiceStatus.set(serviceId, status);
}
