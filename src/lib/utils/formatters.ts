/**
 * Shared Formatting Utilities
 * 
 * Common formatters used across the dashboard application.
 */

/**
 * Formats bytes into human-readable format (B, KB, MB, GB, TB)
 * @param bytes - Number of bytes to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.5 GB")
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Formats seconds into a human-readable uptime string
 * @param seconds - Number of seconds
 * @returns Formatted uptime (e.g., "2d 5h" or "3h 45m")
 */
export function formatUptime(seconds: number): string {
  if (!seconds) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Formats an uptime percentage with appropriate decimal places
 * @param percent - Uptime percentage (0-100)
 * @returns Formatted string (e.g., "99.95%")
 */
export function formatUptimePercent(percent: number): string {
  if (percent >= 99.99) return "100%";
  if (percent >= 99.9) return `${percent.toFixed(2)}%`;
  if (percent >= 99) return `${percent.toFixed(1)}%`;
  return `${percent.toFixed(0)}%`;
}

/**
 * Formats a number as a percentage string
 * @param value - Number to format
 * @returns Formatted percentage (e.g., "85.3%")
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Formats a timestamp as relative time (e.g., "2m ago", "1h ago")
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Formats a duration in milliseconds as a human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration (e.g., "150ms", "2.5s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
