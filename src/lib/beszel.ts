// Beszel API client for fetching historical metrics
// Beszel hub runs at http://localhost:8374

const BESZEL_HUB_URL = process.env.BESZEL_HUB_URL || "http://localhost:8374";

export interface BeszelSystemMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
}

export interface BeszelHistoricalData {
  system: string;
  metrics: BeszelSystemMetrics[];
  period: "1h" | "24h" | "7d" | "30d";
}

export interface BeszelSystem {
  id: string;
  name: string;
  host: string;
  status: "up" | "down" | "unknown";
  lastSeen: string;
  cpu: number;
  memory: number;
  disk: number;
}

/**
 * Fetch current metrics for all systems from Beszel
 */
export async function getBeszelSystems(): Promise<BeszelSystem[]> {
  try {
    const response = await fetch(`${BESZEL_HUB_URL}/api/systems`, {
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error(`Beszel API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Failed to fetch Beszel systems:", error);
    return [];
  }
}

/**
 * Fetch historical metrics for a specific system
 */
export async function getBeszelHistory(
  systemId: string,
  period: "1h" | "24h" | "7d" | "30d" = "24h"
): Promise<BeszelHistoricalData | null> {
  try {
    const response = await fetch(
      `${BESZEL_HUB_URL}/api/systems/${systemId}/history?period=${period}`,
      {
        next: { revalidate: 60 }, // Cache for 1 minute
      }
    );

    if (!response.ok) {
      throw new Error(`Beszel API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Failed to fetch Beszel history:", error);
    return null;
  }
}

/**
 * Check if Beszel hub is available
 */
export async function isBeszelAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${BESZEL_HUB_URL}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Process information structure
 */
export interface ProcessInfo {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  memory: number;
  memoryBytes: number;
  diskRead: number;
  diskWrite: number;
  command: string;
}

/**
 * Process metrics response
 */
export interface ProcessMetrics {
  processes: ProcessInfo[];
  timestamp: string;
  totalProcesses: number;
}

/**
 * Get top processes by CPU usage
 * Falls back to system commands if Beszel doesn't provide process data
 */
export async function getTopProcessesByCpu(limit = 20): Promise<ProcessInfo[]> {
  try {
    // Try Beszel API first
    const response = await fetch(`${BESZEL_HUB_URL}/api/processes?sort=cpu&limit=${limit}`, {
      next: { revalidate: 5 }, // Cache for 5 seconds
    });

    if (response.ok) {
      const data = await response.json();
      return data.processes || [];
    }
  } catch (error) {
    console.error("Beszel process API not available, using system fallback");
  }

  // Fallback to empty array (system commands will be used in API route)
  return [];
}

/**
 * Get top processes by memory usage
 * Falls back to system commands if Beszel doesn't provide process data
 */
export async function getTopProcessesByMemory(limit = 20): Promise<ProcessInfo[]> {
  try {
    // Try Beszel API first
    const response = await fetch(`${BESZEL_HUB_URL}/api/processes?sort=memory&limit=${limit}`, {
      next: { revalidate: 5 }, // Cache for 5 seconds
    });

    if (response.ok) {
      const data = await response.json();
      return data.processes || [];
    }
  } catch (error) {
    console.error("Beszel process API not available, using system fallback");
  }

  // Fallback to empty array (system commands will be used in API route)
  return [];
}

/**
 * Get all process metrics
 */
export async function getAllProcessMetrics(): Promise<ProcessMetrics | null> {
  try {
    const response = await fetch(`${BESZEL_HUB_URL}/api/processes`, {
      next: { revalidate: 5 }, // Cache for 5 seconds
    });

    if (!response.ok) {
      throw new Error(`Beszel API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Failed to fetch Beszel process metrics:", error);
    return null;
  }
}
