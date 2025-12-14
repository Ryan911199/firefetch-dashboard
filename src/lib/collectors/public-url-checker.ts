/**
 * Public URL Health Checker
 * 
 * Validates external accessibility of services through public URLs.
 */

import { addNotification } from '../database';
import { sendPushoverNotification, PushoverPriority } from '../pushover';
import { type ServiceConfig, loadServicesConfig } from './service-health';

// PUBLIC URL checking system (separate from internal health checks)
const PUBLIC_CHECK_INTERVAL = 5 * 60 * 1000;  // 5 minutes normal interval
const PUBLIC_RETRY_DELAY = 30000;              // 30 seconds between retries
const PUBLIC_RECOVERY_INTERVAL = 60000;        // 1 minute recovery check interval
const FAILURE_THRESHOLD = 3;

const publicUrlFailureCount: Map<string, number> = new Map();
const publicUrlRecoveryMode: Map<string, boolean> = new Map();
let publicCheckInterval: NodeJS.Timeout | null = null;

/**
 * Check a service via its public URL (through Cloudflare Tunnel)
 */
async function checkPublicUrl(service: ServiceConfig): Promise<{ success: boolean; responseTime?: number }> {
  try {
    const startTime = Date.now();
    const response = await fetch(service.url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
    });
    const responseTime = Date.now() - startTime;

    if (response.ok || response.status === 301 || response.status === 302 || response.status === 401 || response.status === 405) {
      return { success: true, responseTime };
    }

    return { success: response.status < 500, responseTime };
  } catch {
    return { success: false };
  }
}

/**
 * Schedule a recovery check for a service in recovery mode
 */
function schedulePublicRecoveryCheck(service: ServiceConfig): void {
  setTimeout(async () => {
    if (!publicUrlRecoveryMode.get(service.subdomain)) return;

    const result = await checkPublicUrl(service);
    if (result.success) {
      await checkPublicUrlWithRetry(service);
    } else {
      console.log(`[Public URL] ${service.name} still unreachable in recovery mode`);
      schedulePublicRecoveryCheck(service);
    }
  }, PUBLIC_RECOVERY_INTERVAL);
}

/**
 * Handle public URL check failure - implements 3-strike retry system
 */
export async function checkPublicUrlWithRetry(service: ServiceConfig): Promise<void> {
  const result = await checkPublicUrl(service);

  if (!result.success) {
    const currentFailures = (publicUrlFailureCount.get(service.subdomain) || 0) + 1;
    publicUrlFailureCount.set(service.subdomain, currentFailures);

    if (currentFailures < FAILURE_THRESHOLD) {
      console.log(`[Public URL] ${service.name} failed (${currentFailures}/${FAILURE_THRESHOLD}), retry in ${PUBLIC_RETRY_DELAY / 1000}s`);

      setTimeout(() => {
        checkPublicUrlWithRetry(service).catch(console.error);
      }, PUBLIC_RETRY_DELAY);
    } else {
      console.log(`[Public URL] ${service.name} OFFLINE via public URL after ${FAILURE_THRESHOLD} checks`);

      const notification = {
        timestamp: Date.now(),
        type: 'error' as const,
        title: 'Public URL Unreachable',
        message: `${service.name} is not accessible via public URL (${service.url})`,
        service_id: service.subdomain,
      };
      addNotification(notification);
      await sendPushoverNotification({
        title: `🌐 ${notification.title}`,
        message: notification.message,
        priority: PushoverPriority.HIGH,
        url: service.url,
        url_title: 'View Service',
      });

      publicUrlRecoveryMode.set(service.subdomain, true);
      console.log(`[Public URL] ${service.name} entering recovery mode (checking every ${PUBLIC_RECOVERY_INTERVAL / 1000}s)`);
      schedulePublicRecoveryCheck(service);
    }
  } else {
    const wasInRecovery = publicUrlRecoveryMode.get(service.subdomain);

    if (wasInRecovery) {
      console.log(`[Public URL] ${service.name} passed check in recovery mode, verifying in ${PUBLIC_RECOVERY_INTERVAL / 1000}s`);
      publicUrlFailureCount.set(service.subdomain, 0);

      setTimeout(async () => {
        const verifyResult = await checkPublicUrl(service);
        if (verifyResult.success) {
          console.log(`[Public URL] ${service.name} confirmed recovered via public URL`);
          publicUrlRecoveryMode.set(service.subdomain, false);

          const notification = {
            timestamp: Date.now(),
            type: 'success' as const,
            title: 'Public URL Recovered',
            message: `${service.name} is accessible again via public URL`,
            service_id: service.subdomain,
          };
          addNotification(notification);
          await sendPushoverNotification({
            title: `🌐 ${notification.title}`,
            message: notification.message,
            priority: PushoverPriority.NORMAL,
          });
        } else {
          console.log(`[Public URL] ${service.name} verification failed, staying in recovery mode`);
          publicUrlFailureCount.set(service.subdomain, 1);
          schedulePublicRecoveryCheck(service);
        }
      }, PUBLIC_RECOVERY_INTERVAL);
    } else {
      publicUrlFailureCount.set(service.subdomain, 0);
      console.log(`[Public URL] ${service.name} OK (${result.responseTime}ms)`);
    }
  }
}

/**
 * Run public URL checks for all services
 */
export async function collectPublicUrlHealth(): Promise<void> {
  const services = await loadServicesConfig();

  const publicServices = services.filter(s => !s.internal_only);
  console.log(`[Public URL] Starting public URL checks for ${publicServices.length} services (${services.length - publicServices.length} internal-only skipped)...`);

  for (const service of publicServices) {
    if (!publicUrlRecoveryMode.get(service.subdomain)) {
      checkPublicUrlWithRetry(service).catch(console.error);
    }
  }
}

export function startPublicUrlChecker(): void {
  setTimeout(() => {
    console.log('[Public URL] Starting initial public URL checks...');
    collectPublicUrlHealth().catch(console.error);

    publicCheckInterval = setInterval(() => {
      collectPublicUrlHealth().catch(console.error);
    }, PUBLIC_CHECK_INTERVAL);
  }, 30000);
}

export function stopPublicUrlChecker(): void {
  if (publicCheckInterval) {
    clearInterval(publicCheckInterval);
    publicCheckInterval = null;
  }
  publicUrlRecoveryMode.clear();
  publicUrlFailureCount.clear();
}

export { PUBLIC_CHECK_INTERVAL, PUBLIC_RETRY_DELAY, PUBLIC_RECOVERY_INTERVAL };
