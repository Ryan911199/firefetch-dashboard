/**
 * API Client
 * Centralized fetch utilities with error handling and caching
 */

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Fetch with timeout and retry support
 */
export async function fetchWithTimeout<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 10000, retries = 1, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  clearTimeout(timeoutId);
  throw lastError || new Error('Request failed');
}

/**
 * Fetch with caching
 */
export async function fetchWithCache<T>(
  url: string,
  ttl: number = 5000,
  options: FetchOptions = {}
): Promise<T> {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;

  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }

  const data = await fetchWithTimeout<T>(url, options);

  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl,
  });

  return data;
}

/**
 * Clear cache
 */
export function clearCache(pattern?: string): void {
  if (pattern) {
    const keys = Array.from(cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format uptime to human-readable string
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate health score from metrics
 */
export function calculateHealthScore(metrics: {
  cpu: number;
  memory: number;
  disk: number;
  servicesOnline: number;
  servicesTotal: number;
}): number {
  const weights = {
    cpu: 0.25,
    memory: 0.25,
    disk: 0.2,
    services: 0.3,
  };

  // Invert CPU, memory, disk (lower is better)
  const cpuScore = Math.max(0, 100 - metrics.cpu);
  const memScore = Math.max(0, 100 - metrics.memory);
  const diskScore = Math.max(0, 100 - metrics.disk);

  // Services uptime percentage
  const servicesScore =
    metrics.servicesTotal > 0
      ? (metrics.servicesOnline / metrics.servicesTotal) * 100
      : 100;

  return Math.round(
    cpuScore * weights.cpu +
      memScore * weights.memory +
      diskScore * weights.disk +
      servicesScore * weights.services
  );
}
