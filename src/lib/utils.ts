import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and tailwind-merge
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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
 * Returns the appropriate text color class for a status
 * @param status - Service or container status
 * @returns Tailwind text color class
 */
export function getStatusColor(status: "online" | "offline" | "degraded" | "unknown"): string {
  switch (status) {
    case "online":
      return "text-success";
    case "offline":
      return "text-error";
    case "degraded":
      return "text-warning";
    default:
      return "text-text-muted";
  }
}

/**
 * Returns the appropriate background color class for a status dot
 * @param status - Service or container status
 * @returns Tailwind background color class
 */
export function getStatusDot(status: "online" | "offline" | "degraded" | "unknown"): string {
  switch (status) {
    case "online":
      return "bg-success";
    case "offline":
      return "bg-error";
    case "degraded":
      return "bg-warning";
    default:
      return "bg-text-muted";
  }
}
