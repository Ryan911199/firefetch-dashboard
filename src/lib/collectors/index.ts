/**
 * Metrics Collector Main Module
 * 
 * Orchestrates all metrics collection with decoupled architecture:
 * - UI Updates: Real-time via WebSocket (2-5 second intervals)
 * - Database Storage: Periodic persistence (5-10-30 second intervals)
 * - Notifications: Pushover with 3-strike system
 */

import {
  type MetricsSnapshot,
  type ContainerSnapshot,
  type ServiceSnapshot,
  insertMetricsSnapshot,
  insertContainerStats,
  insertServiceStatus,
  addNotification,
} from '../database';
import { collectSystemMetricsData } from './system-metrics';
import { collectDockerStats } from './docker-stats';
import {
  loadServicesConfig,
  checkServiceWithRetry,
  getPrevServiceStatus,
  setPrevServiceStatus,
  type ServiceConfig,
} from './service-health';
import { checkResourceAlerts } from './notification-handler';
import {
  startPublicUrlChecker,
  stopPublicUrlChecker,
  PUBLIC_CHECK_INTERVAL,
  PUBLIC_RETRY_DELAY,
  PUBLIC_RECOVERY_INTERVAL,
} from './public-url-checker';

// Re-export types and functions
export type { ServiceConfig };
export {
  collectSystemMetricsData,
  collectDockerStats,
  loadServicesConfig,
  checkServiceWithRetry,
  checkResourceAlerts,
};

// Intervals for UI updates (fast, for real-time feel)
export const UI_INTERVALS = {
  SYSTEM_METRICS: 2000,
  DOCKER_STATS: 5000,
  SERVICE_HEALTH: 30000,
};

// Intervals for database storage (slower, for efficiency)
export const STORAGE_INTERVALS = {
  SYSTEM_METRICS: 5000,
  DOCKER_STATS: 10000,
  SERVICE_HEALTH: 30000,
};

// Track last storage times
let lastMetricsStore = 0;
let lastContainerStore = 0;
let lastServiceStore = 0;

// Latest values cache (for instant access)
let latestMetrics: MetricsSnapshot | null = null;
let latestContainers: ContainerSnapshot[] = [];
let latestServices: ServiceSnapshot[] = [];

// Event emitter for real-time updates
type MetricsListener = (metrics: MetricsSnapshot) => void;
type ContainerListener = (containers: ContainerSnapshot[]) => void;
type ServiceListener = (services: ServiceSnapshot[]) => void;

const metricsListeners: Set<MetricsListener> = new Set();
const containerListeners: Set<ContainerListener> = new Set();
const serviceListeners: Set<ServiceListener> = new Set();

// Subscription functions
export function onMetricsUpdate(listener: MetricsListener): () => void {
  metricsListeners.add(listener);
  if (latestMetrics) {
    listener(latestMetrics);
  }
  return () => metricsListeners.delete(listener);
}

export function onContainerUpdate(listener: ContainerListener): () => void {
  containerListeners.add(listener);
  if (latestContainers.length > 0) {
    listener(latestContainers);
  }
  return () => containerListeners.delete(listener);
}

export function onServiceUpdate(listener: ServiceListener): () => void {
  serviceListeners.add(listener);
  if (latestServices.length > 0) {
    listener(latestServices);
  }
  return () => serviceListeners.delete(listener);
}

// Cache getters
export function getLatestCachedMetrics(): MetricsSnapshot | null {
  return latestMetrics;
}

export function getLatestCachedContainers(): ContainerSnapshot[] {
  return latestContainers;
}

export function getLatestCachedServices(): ServiceSnapshot[] {
  return latestServices;
}

// Collection functions
export async function collectSystemMetrics(forceStore: boolean = false): Promise<MetricsSnapshot> {
  const metrics = await collectSystemMetricsData();
  const now = Date.now();

  latestMetrics = metrics;

  if (forceStore || now - lastMetricsStore >= STORAGE_INTERVALS.SYSTEM_METRICS) {
    insertMetricsSnapshot(metrics);
    lastMetricsStore = now;
    await checkResourceAlerts(metrics);
  }

  metricsListeners.forEach((listener) => listener(metrics));

  return metrics;
}

export async function collectContainerStats(forceStore: boolean = false): Promise<ContainerSnapshot[]> {
  const containers = await collectDockerStats();
  const now = Date.now();

  latestContainers = containers;

  if (forceStore || now - lastContainerStore >= STORAGE_INTERVALS.DOCKER_STATS) {
    if (containers.length > 0) {
      insertContainerStats(containers);
    }
    lastContainerStore = now;
  }

  containerListeners.forEach((listener) => listener(containers));

  return containers;
}

export async function collectServiceHealth(forceStore: boolean = false): Promise<ServiceSnapshot[]> {
  const services = await loadServicesConfig();
  const now = Date.now();

  const results = await Promise.all(
    services.map((service) =>
      checkServiceWithRetry(service, (serviceId, status) => {
        const idx = latestServices.findIndex(s => s.service_id === serviceId);
        if (idx >= 0) {
          latestServices[idx] = status;
          serviceListeners.forEach((listener) => listener(latestServices));
        }
      })
    )
  );

  latestServices = results;

  // Handle degraded status changes
  for (const service of results) {
    if (service.status !== 'offline') {
      const prevStatus = getPrevServiceStatus(service.service_id);

      if (service.status === 'degraded' && prevStatus !== 'degraded') {
        const notification = {
          timestamp: now,
          type: 'warning' as const,
          title: 'Service Degraded',
          message: `${service.service_name} is experiencing issues (response time: ${service.response_time}ms)`,
          service_id: service.service_id,
        };
        addNotification(notification);
      }

      setPrevServiceStatus(service.service_id, service.status);
    }
  }

  if (forceStore || now - lastServiceStore >= STORAGE_INTERVALS.SERVICE_HEALTH) {
    if (results.length > 0) {
      insertServiceStatus(results);
    }
    lastServiceStore = now;
  }

  serviceListeners.forEach((listener) => listener(results));

  return results;
}

// Lifecycle management
let metricsInterval: NodeJS.Timeout | null = null;
let containersInterval: NodeJS.Timeout | null = null;
let servicesInterval: NodeJS.Timeout | null = null;
let isRunning = false;

export function startCollector(): void {
  if (isRunning) return;
  isRunning = true;

  console.log('[Metrics Collector] Starting with 3-strike notification system...');

  // Collect immediately on start
  collectSystemMetrics(true).catch(console.error);
  collectContainerStats(true).catch(console.error);
  collectServiceHealth(true).catch(console.error);

  // Set up intervals
  metricsInterval = setInterval(() => {
    collectSystemMetrics().catch(console.error);
  }, UI_INTERVALS.SYSTEM_METRICS);

  containersInterval = setInterval(() => {
    collectContainerStats().catch(console.error);
  }, UI_INTERVALS.DOCKER_STATS);

  servicesInterval = setInterval(() => {
    collectServiceHealth().catch(console.error);
  }, UI_INTERVALS.SERVICE_HEALTH);

  // Start public URL checker
  startPublicUrlChecker();

  console.log('[Metrics Collector] Started:', {
    intervals: {
      systemMetrics: `${UI_INTERVALS.SYSTEM_METRICS}ms`,
      dockerStats: `${UI_INTERVALS.DOCKER_STATS}ms`,
      serviceHealth: `${UI_INTERVALS.SERVICE_HEALTH}ms (internal)`,
      publicUrlCheck: `${PUBLIC_CHECK_INTERVAL / 1000}s (external)`,
    },
  });
}

export function stopCollector(): void {
  if (!isRunning) return;
  isRunning = false;

  if (metricsInterval) clearInterval(metricsInterval);
  if (containersInterval) clearInterval(containersInterval);
  if (servicesInterval) clearInterval(servicesInterval);

  metricsInterval = null;
  containersInterval = null;
  servicesInterval = null;

  stopPublicUrlChecker();

  console.log('[Metrics Collector] Stopped');
}

export function isCollectorRunning(): boolean {
  return isRunning;
}
