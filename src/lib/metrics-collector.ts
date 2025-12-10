/**
 * Metrics Collector for FireFetch Dashboard
 *
 * Decoupled architecture:
 * - UI Updates: Real-time via WebSocket (2-5 second intervals)
 * - Database Storage: Periodic persistence (5-10-30 second intervals)
 * - Notifications: Pushover with 3-strike system (must fail 3x over ~1 min)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs';
import {
  insertMetricsSnapshot,
  insertContainerStats,
  insertServiceStatus,
  addNotification,
  getLatestMetrics,
  MetricsSnapshot,
  ContainerSnapshot,
  ServiceSnapshot,
} from './database';
import { sendPushoverNotification, PushoverPriority } from './pushover';

const execAsync = promisify(exec);

// Intervals for UI updates (fast, for real-time feel)
export const UI_INTERVALS = {
  SYSTEM_METRICS: 2000,     // 2 seconds - real-time UI updates
  DOCKER_STATS: 5000,       // 5 seconds - Docker stats are heavier
  SERVICE_HEALTH: 30000,    // 30 seconds - service checks (fixed interval)
};

// Intervals for database storage (slower, for efficiency)
export const STORAGE_INTERVALS = {
  SYSTEM_METRICS: 5000,     // 5 seconds
  DOCKER_STATS: 10000,      // 10 seconds
  SERVICE_HEALTH: 30000,    // 30 seconds
};

// 3-strike notification system for INTERNAL health checks
// Track consecutive failures before sending notification
const serviceFailureCount: Map<string, number> = new Map();
const FAILURE_THRESHOLD = 3;  // Must fail 3 times before notification
const RETRY_DELAY = 15000;    // 15 seconds between retry checks

// PUBLIC URL checking system (separate from internal health checks)
// Runs less frequently but validates external accessibility
const PUBLIC_CHECK_INTERVAL = 5 * 60 * 1000;  // 5 minutes normal interval
const PUBLIC_RETRY_DELAY = 30000;              // 30 seconds between retries
const PUBLIC_RECOVERY_INTERVAL = 60000;        // 1 minute recovery check interval
const publicUrlFailureCount: Map<string, number> = new Map();
const publicUrlRecoveryMode: Map<string, boolean> = new Map();  // Track if service is in recovery mode
let publicCheckInterval: NodeJS.Timeout | null = null;

// Track last storage times
let lastMetricsStore = 0;
let lastContainerStore = 0;
let lastServiceStore = 0;

// Store previous values for rate calculations
let prevCpuStats: { idle: number; total: number; timestamp: number } | null = null;
let prevNetStats: { rx: number; tx: number; timestamp: number } | null = null;
let prevServiceStatus: Map<string, string> = new Map();

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

// Get cached latest values (for REST API fallback)
export function getLatestCachedMetrics(): MetricsSnapshot | null {
  return latestMetrics;
}

export function getLatestCachedContainers(): ContainerSnapshot[] {
  return latestContainers;
}

export function getLatestCachedServices(): ServiceSnapshot[] {
  return latestServices;
}

// ============================================
// SYSTEM METRICS COLLECTION
// ============================================

async function getCpuUsage(): Promise<number> {
  try {
    const { stdout } = await execAsync('head -1 /proc/stat');
    const parts = stdout.trim().split(/\s+/);
    const idle = parseInt(parts[4], 10) + parseInt(parts[5], 10);
    const total = parts.slice(1, 11).reduce((sum, val) => sum + parseInt(val, 10), 0);
    const now = Date.now();

    if (prevCpuStats && now - prevCpuStats.timestamp < 10000) {
      const idleDiff = idle - prevCpuStats.idle;
      const totalDiff = total - prevCpuStats.total;
      const usage = totalDiff > 0 ? 100 * (1 - idleDiff / totalDiff) : 0;
      prevCpuStats = { idle, total, timestamp: now };
      return Math.max(0, Math.min(100, usage));
    }

    prevCpuStats = { idle, total, timestamp: now };

    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    return 100 - (100 * totalIdle) / totalTick;
  } catch {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    return 100 - (100 * totalIdle) / totalTick;
  }
}

async function getDiskUsage(): Promise<{ used: number; total: number; percent: number }> {
  try {
    const { stdout } = await execAsync("df -B1 / | tail -1 | awk '{print $2,$3,$5}'");
    const [total, used, percent] = stdout.trim().split(' ');
    return {
      total: parseInt(total, 10),
      used: parseInt(used, 10),
      percent: parseInt(percent.replace('%', ''), 10),
    };
  } catch {
    return { used: 0, total: 0, percent: 0 };
  }
}

async function getNetworkStats(): Promise<{ rx: number; tx: number }> {
  try {
    const now = Date.now();
    const { stdout } = await execAsync(
      "cat /proc/net/dev | grep -E 'eth0|ens|enp' | head -1 | awk '{print $2, $10}'"
    );
    const [rx, tx] = stdout.trim().split(' ').map(Number);

    if (!rx || !tx) {
      return { rx: 0, tx: 0 };
    }

    if (prevNetStats) {
      const timeDiff = (now - prevNetStats.timestamp) / 1000;
      if (timeDiff > 0) {
        const rxRate = Math.max(0, (rx - prevNetStats.rx) / timeDiff);
        const txRate = Math.max(0, (tx - prevNetStats.tx) / timeDiff);
        prevNetStats = { rx, tx, timestamp: now };
        return { rx: rxRate, tx: txRate };
      }
    }

    prevNetStats = { rx, tx, timestamp: now };
    return { rx: 0, tx: 0 };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

export async function collectSystemMetrics(forceStore: boolean = false): Promise<MetricsSnapshot> {
  const [cpu, disk, network] = await Promise.all([
    getCpuUsage(),
    getDiskUsage(),
    getNetworkStats(),
  ]);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const loadAvg = os.loadavg();
  const now = Date.now();

  const metrics: MetricsSnapshot = {
    timestamp: now,
    cpu_percent: cpu,
    memory_used: usedMem,
    memory_total: totalMem,
    memory_percent: (usedMem / totalMem) * 100,
    disk_used: disk.used,
    disk_total: disk.total,
    disk_percent: disk.percent,
    network_rx: network.rx,
    network_tx: network.tx,
    load_1m: loadAvg[0],
    load_5m: loadAvg[1],
    load_15m: loadAvg[2],
    uptime: os.uptime(),
  };

  latestMetrics = metrics;

  if (forceStore || now - lastMetricsStore >= STORAGE_INTERVALS.SYSTEM_METRICS) {
    insertMetricsSnapshot(metrics);
    lastMetricsStore = now;
    await checkResourceAlerts(metrics);
  }

  metricsListeners.forEach((listener) => listener(metrics));

  return metrics;
}

async function checkResourceAlerts(metrics: MetricsSnapshot): Promise<void> {
  const previous = getLatestMetrics();

  if (metrics.cpu_percent > 90 && (!previous || previous.cpu_percent <= 90)) {
    const notification = {
      timestamp: Date.now(),
      type: 'warning' as const,
      title: 'High CPU Usage',
      message: `CPU usage is at ${metrics.cpu_percent.toFixed(1)}%`,
    };
    addNotification(notification);
    await sendPushoverNotification({
      title: notification.title,
      message: notification.message,
      priority: PushoverPriority.HIGH,
    });
  }

  if (metrics.memory_percent > 90 && (!previous || previous.memory_percent <= 90)) {
    const notification = {
      timestamp: Date.now(),
      type: 'warning' as const,
      title: 'High Memory Usage',
      message: `Memory usage is at ${metrics.memory_percent.toFixed(1)}%`,
    };
    addNotification(notification);
    await sendPushoverNotification({
      title: notification.title,
      message: notification.message,
      priority: PushoverPriority.HIGH,
    });
  }

  if (metrics.disk_percent > 90 && (!previous || previous.disk_percent <= 90)) {
    const notification = {
      timestamp: Date.now(),
      type: 'error' as const,
      title: 'Low Disk Space',
      message: `Disk usage is at ${metrics.disk_percent.toFixed(1)}%`,
    };
    addNotification(notification);
    await sendPushoverNotification({
      title: notification.title,
      message: notification.message,
      priority: PushoverPriority.EMERGENCY,
      retry: 60,
      expire: 3600,
    });
  }
}

// ============================================
// DOCKER CONTAINER COLLECTION
// ============================================

function parseDockerStats(statsOutput: string): Map<string, { cpu: number; memUsed: number; memLimit: number }> {
  const stats = new Map();
  const lines = statsOutput.trim().split('\n').slice(1);

  for (const line of lines) {
    const parts = line.split(/\s{2,}/);
    if (parts.length >= 4) {
      const name = parts[1];
      const cpuStr = parts[2].replace('%', '');
      const memParts = parts[3].split(' / ');

      stats.set(name, {
        cpu: parseFloat(cpuStr) || 0,
        memUsed: parseMemory(memParts[0]),
        memLimit: parseMemory(memParts[1]),
      });
    }
  }

  return stats;
}

function parseMemory(memStr: string): number {
  const match = memStr.match(/^([\d.]+)([KMGTP]?i?B?)$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    KIB: 1024,
    MB: 1024 ** 2,
    MIB: 1024 ** 2,
    GB: 1024 ** 3,
    GIB: 1024 ** 3,
    TB: 1024 ** 4,
    TIB: 1024 ** 4,
  };

  return value * (multipliers[unit] || 1);
}

export async function collectContainerStats(forceStore: boolean = false): Promise<ContainerSnapshot[]> {
  try {
    const now = Date.now();

    // Combined command using bash to get both ps and stats in one subprocess
    // This reduces overhead by ~50% compared to separate commands
    const { stdout: combinedOutput } = await execAsync(`
      docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}" && echo "---STATS---" && \
      docker stats --no-stream --format 'table {{.ID}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
    `);

    const [psOutput, statsOutput] = combinedOutput.split('---STATS---');

    const statsMap = parseDockerStats(statsOutput.trim());
    const containers: ContainerSnapshot[] = [];

    for (const line of psOutput.trim().split('\n')) {
      if (!line) continue;

      const [id, name, image, ...statusParts] = line.split('\t');
      const statusStr = statusParts.join('\t');

      let status = 'stopped';
      if (statusStr.includes('Up')) status = 'running';
      else if (statusStr.includes('Restarting')) status = 'restarting';
      else if (statusStr.includes('Paused')) status = 'paused';

      const stats = statsMap.get(name) || { cpu: 0, memUsed: 0, memLimit: 0 };

      containers.push({
        timestamp: now,
        container_id: id.substring(0, 12),
        container_name: name,
        cpu_percent: stats.cpu,
        memory_used: stats.memUsed,
        memory_limit: stats.memLimit || 1073741824,
        status,
      });
    }

    latestContainers = containers;

    if (forceStore || now - lastContainerStore >= STORAGE_INTERVALS.DOCKER_STATS) {
      if (containers.length > 0) {
        insertContainerStats(containers);
      }
      lastContainerStore = now;
    }

    containerListeners.forEach((listener) => listener(containers));

    return containers;
  } catch (error) {
    console.error('Failed to collect container stats:', error);
    return latestContainers;
  }
}

// ============================================
// SERVICE HEALTH COLLECTION
// ============================================

interface ServiceConfig {
  name: string;
  subdomain: string;
  url: string;
  internal_url?: string;
  internal_port: number;
  description: string;
  internal_only?: boolean;  // Skip public URL checks for internal-only services
}

async function loadServicesConfig(): Promise<ServiceConfig[]> {
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
 * Uses host.docker.internal when running in Docker to reach host services
 * Falls back to localhost for direct execution
 */
function getInternalUrl(service: ServiceConfig): string {
  if (service.internal_url) {
    return service.internal_url;
  }

  // Detect if running in Docker by checking for /.dockerenv or cgroup
  const isDocker = process.env.DOCKER_ENV === 'true' ||
    require('fs').existsSync('/.dockerenv');

  // Use host.docker.internal in Docker, localhost otherwise
  const host = isDocker ? 'host.docker.internal' : 'localhost';

  return `http://${host}:${service.internal_port}`;
}

async function checkServiceHealth(service: ServiceConfig): Promise<ServiceSnapshot> {
  const timestamp = Date.now();
  let status: 'online' | 'offline' | 'degraded' = 'offline';
  let responseTime: number | undefined;

  // Use internal URL for faster, more accurate health checks
  const checkUrl = getInternalUrl(service);

  try {
    const startTime = Date.now();
    const response = await fetch(checkUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    responseTime = Date.now() - startTime;

    if (response.ok || response.status === 301 || response.status === 302 || response.status === 401 || response.status === 405) {
      // 405 Method Not Allowed is fine - service is responding
      status = responseTime > 2000 ? 'degraded' : 'online';
    } else if (response.status >= 500) {
      status = 'offline';
    } else {
      // Any other response means the service is at least responding
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

/**
 * Perform a single health check with optional retry
 * Returns the status after checking
 */
async function checkServiceWithRetry(service: ServiceConfig): Promise<ServiceSnapshot> {
  const result = await checkServiceHealth(service);

  if (result.status === 'offline') {
    // First failure - check failure count
    const currentFailures = serviceFailureCount.get(service.subdomain) || 0;
    serviceFailureCount.set(service.subdomain, currentFailures + 1);

    // If we haven't hit threshold, schedule a recheck
    if (currentFailures + 1 < FAILURE_THRESHOLD) {
      console.log(`[Health] ${service.name} failed (${currentFailures + 1}/${FAILURE_THRESHOLD}), will recheck in ${RETRY_DELAY / 1000}s`);

      // Schedule retry check
      setTimeout(async () => {
        const retryResult = await checkServiceHealth(service);
        if (retryResult.status === 'offline') {
          const newFailures = (serviceFailureCount.get(service.subdomain) || 0) + 1;
          serviceFailureCount.set(service.subdomain, newFailures);

          if (newFailures >= FAILURE_THRESHOLD) {
            // Now we can notify
            await handleServiceOffline(service, retryResult);
          } else {
            console.log(`[Health] ${service.name} retry failed (${newFailures}/${FAILURE_THRESHOLD})`);
          }
        } else {
          // Service recovered on retry
          console.log(`[Health] ${service.name} recovered on retry`);
          serviceFailureCount.set(service.subdomain, 0);
          // Update the cached status
          const idx = latestServices.findIndex(s => s.service_id === service.subdomain);
          if (idx >= 0) {
            latestServices[idx] = retryResult;
            serviceListeners.forEach((listener) => listener(latestServices));
          }
        }
      }, RETRY_DELAY);
    } else {
      // Hit threshold - notify
      await handleServiceOffline(service, result);
    }
  } else {
    // Service is online - reset failure count
    const wasOffline = serviceFailureCount.get(service.subdomain) || 0;
    if (wasOffline >= FAILURE_THRESHOLD) {
      // Service recovered after being confirmed offline
      await handleServiceRecovered(service, result);
    }
    serviceFailureCount.set(service.subdomain, 0);
  }

  return result;
}

async function handleServiceOffline(service: ServiceConfig, result: ServiceSnapshot): Promise<void> {
  const prevStatus = prevServiceStatus.get(service.subdomain);

  // Only notify if this is a status change
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

// ============================================
// PUBLIC URL HEALTH CHECKS
// ============================================

/**
 * Check a service via its public URL (through Cloudflare Tunnel)
 * This is separate from internal checks and validates external accessibility
 */
async function checkPublicUrl(service: ServiceConfig): Promise<{ success: boolean; responseTime?: number }> {
  try {
    const startTime = Date.now();
    const response = await fetch(service.url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),  // 10s timeout for external
    });
    const responseTime = Date.now() - startTime;

    // Consider any response from the service as "reachable"
    if (response.ok || response.status === 301 || response.status === 302 || response.status === 401 || response.status === 405) {
      return { success: true, responseTime };
    }

    // 5xx errors mean public URL is failing
    return { success: response.status < 500, responseTime };
  } catch {
    return { success: false };
  }
}

/**
 * Handle public URL check failure - implements 3-strike retry system
 */
async function checkPublicUrlWithRetry(service: ServiceConfig): Promise<void> {
  const result = await checkPublicUrl(service);

  if (!result.success) {
    const currentFailures = (publicUrlFailureCount.get(service.subdomain) || 0) + 1;
    publicUrlFailureCount.set(service.subdomain, currentFailures);

    if (currentFailures < FAILURE_THRESHOLD) {
      console.log(`[Public URL] ${service.name} failed (${currentFailures}/${FAILURE_THRESHOLD}), retry in ${PUBLIC_RETRY_DELAY / 1000}s`);

      // Schedule retry
      setTimeout(() => {
        checkPublicUrlWithRetry(service).catch(console.error);
      }, PUBLIC_RETRY_DELAY);
    } else {
      // 3rd failure - send notification
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

      // Enter recovery mode - check more frequently
      publicUrlRecoveryMode.set(service.subdomain, true);
      console.log(`[Public URL] ${service.name} entering recovery mode (checking every ${PUBLIC_RECOVERY_INTERVAL / 1000}s)`);
      schedulePublicRecoveryCheck(service);
    }
  } else {
    // Success - reset failure count
    const wasInRecovery = publicUrlRecoveryMode.get(service.subdomain);

    if (wasInRecovery) {
      // Service recovered - need one more successful check to confirm
      console.log(`[Public URL] ${service.name} passed check in recovery mode, verifying in ${PUBLIC_RECOVERY_INTERVAL / 1000}s`);
      publicUrlFailureCount.set(service.subdomain, 0);

      // Schedule verification check
      setTimeout(async () => {
        const verifyResult = await checkPublicUrl(service);
        if (verifyResult.success) {
          // Confirmed recovery
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
          // Still failing - stay in recovery mode
          console.log(`[Public URL] ${service.name} verification failed, staying in recovery mode`);
          publicUrlFailureCount.set(service.subdomain, 1);
          schedulePublicRecoveryCheck(service);
        }
      }, PUBLIC_RECOVERY_INTERVAL);
    } else {
      // Normal successful check
      publicUrlFailureCount.set(service.subdomain, 0);
      console.log(`[Public URL] ${service.name} OK (${result.responseTime}ms)`);
    }
  }
}

/**
 * Schedule a recovery check for a service in recovery mode
 */
function schedulePublicRecoveryCheck(service: ServiceConfig): void {
  setTimeout(async () => {
    if (!publicUrlRecoveryMode.get(service.subdomain)) return;  // Exited recovery mode

    const result = await checkPublicUrl(service);
    if (result.success) {
      // Check again to confirm
      await checkPublicUrlWithRetry(service);
    } else {
      // Still failing
      console.log(`[Public URL] ${service.name} still unreachable in recovery mode`);
      schedulePublicRecoveryCheck(service);
    }
  }, PUBLIC_RECOVERY_INTERVAL);
}

/**
 * Run public URL checks for all services
 */
async function collectPublicUrlHealth(): Promise<void> {
  const services = await loadServicesConfig();

  // Filter out internal-only services (they don't have public URLs)
  const publicServices = services.filter(s => !s.internal_only);
  console.log(`[Public URL] Starting public URL checks for ${publicServices.length} services (${services.length - publicServices.length} internal-only skipped)...`);

  // Check all services that aren't in recovery mode
  // (recovery mode services have their own checking schedule)
  for (const service of publicServices) {
    if (!publicUrlRecoveryMode.get(service.subdomain)) {
      checkPublicUrlWithRetry(service).catch(console.error);
    }
  }
}

export async function collectServiceHealth(forceStore: boolean = false): Promise<ServiceSnapshot[]> {
  const services = await loadServicesConfig();
  const now = Date.now();

  // Check all services (using 3-strike system for notifications)
  const results = await Promise.all(
    services.map((service) => checkServiceWithRetry(service))
  );

  latestServices = results;

  // Update status tracking for non-offline services
  for (const service of results) {
    if (service.status !== 'offline') {
      const prevStatus = prevServiceStatus.get(service.service_id);

      // Handle degraded status changes
      if (service.status === 'degraded' && prevStatus !== 'degraded') {
        const serviceConfig = services.find(s => s.subdomain === service.service_id);
        if (serviceConfig) {
          const notification = {
            timestamp: now,
            type: 'warning' as const,
            title: 'Service Degraded',
            message: `${service.service_name} is experiencing issues (response time: ${service.response_time}ms)`,
            service_id: service.service_id,
          };
          addNotification(notification);
          // Don't send Pushover for degraded - too noisy
        }
      }

      prevServiceStatus.set(service.service_id, service.status);
    }
  }

  // Store in database
  if (forceStore || now - lastServiceStore >= STORAGE_INTERVALS.SERVICE_HEALTH) {
    if (results.length > 0) {
      insertServiceStatus(results);
    }
    lastServiceStore = now;
  }

  serviceListeners.forEach((listener) => listener(results));

  return results;
}

// ============================================
// COLLECTOR LIFECYCLE
// ============================================

let metricsInterval: NodeJS.Timeout | null = null;
let containersInterval: NodeJS.Timeout | null = null;
let servicesInterval: NodeJS.Timeout | null = null;
let isRunning = false;

export function startCollector(): void {
  if (isRunning) return;
  isRunning = true;

  console.log('[Metrics Collector] Starting with 3-strike notification system...');

  // Collect immediately on start (force store to initialize)
  collectSystemMetrics(true).catch(console.error);
  collectContainerStats(true).catch(console.error);
  collectServiceHealth(true).catch(console.error);

  // Set up intervals for internal health checks
  metricsInterval = setInterval(() => {
    collectSystemMetrics().catch(console.error);
  }, UI_INTERVALS.SYSTEM_METRICS);

  containersInterval = setInterval(() => {
    collectContainerStats().catch(console.error);
  }, UI_INTERVALS.DOCKER_STATS);

  servicesInterval = setInterval(() => {
    collectServiceHealth().catch(console.error);
  }, UI_INTERVALS.SERVICE_HEALTH);

  // Set up public URL checking (separate from internal checks)
  // First check after 30 seconds (let services stabilize), then every 5 minutes
  setTimeout(() => {
    console.log('[Public URL] Starting initial public URL checks...');
    collectPublicUrlHealth().catch(console.error);

    // Then check every 5 minutes
    publicCheckInterval = setInterval(() => {
      collectPublicUrlHealth().catch(console.error);
    }, PUBLIC_CHECK_INTERVAL);
  }, 30000);

  console.log('[Metrics Collector] Started:', {
    intervals: {
      systemMetrics: `${UI_INTERVALS.SYSTEM_METRICS}ms`,
      dockerStats: `${UI_INTERVALS.DOCKER_STATS}ms`,
      serviceHealth: `${UI_INTERVALS.SERVICE_HEALTH}ms (internal)`,
      publicUrlCheck: `${PUBLIC_CHECK_INTERVAL / 1000}s (external)`,
    },
    internalNotifications: {
      failureThreshold: FAILURE_THRESHOLD,
      retryDelay: `${RETRY_DELAY / 1000}s`,
      timeToNotify: `~${(FAILURE_THRESHOLD - 1) * (RETRY_DELAY / 1000)}s after first failure`,
    },
    publicUrlNotifications: {
      failureThreshold: FAILURE_THRESHOLD,
      retryDelay: `${PUBLIC_RETRY_DELAY / 1000}s`,
      recoveryCheckInterval: `${PUBLIC_RECOVERY_INTERVAL / 1000}s`,
      timeToNotify: `~${(FAILURE_THRESHOLD - 1) * (PUBLIC_RETRY_DELAY / 1000)}s after first failure`,
    },
  });
}

export function stopCollector(): void {
  if (!isRunning) return;
  isRunning = false;

  if (metricsInterval) clearInterval(metricsInterval);
  if (containersInterval) clearInterval(containersInterval);
  if (servicesInterval) clearInterval(servicesInterval);
  if (publicCheckInterval) clearInterval(publicCheckInterval);

  metricsInterval = null;
  containersInterval = null;
  servicesInterval = null;
  publicCheckInterval = null;

  // Clear recovery modes
  publicUrlRecoveryMode.clear();
  publicUrlFailureCount.clear();

  console.log('[Metrics Collector] Stopped');
}

export function isCollectorRunning(): boolean {
  return isRunning;
}
