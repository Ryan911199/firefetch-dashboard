import { config } from "./config";

/**
 * Uptime Kuma API Integration
 * Provides helper functions to interact with Uptime Kuma monitoring service
 *
 * Note: Uptime Kuma primarily uses Socket.IO for real-time data.
 * This implementation uses the status page API and badge endpoints as a workaround.
 * For full functionality, consider using the Socket.IO client or Uptime Kuma's official API.
 */

export interface UptimeMonitor {
  id: number;
  name: string;
  url: string;
  type: string;
  active: boolean;
  uptime24h?: number;
  uptime30d?: number;
  uptime?: number;
  avgPing?: number;
  lastHeartbeat?: {
    status: boolean;
    msg: string;
    ping: number;
    time: string;
  };
}

export interface UptimeHeartbeat {
  monitorID: number;
  status: boolean;
  msg: string;
  ping: number;
  time: string;
  duration: number;
}

export interface UptimeStatusPage {
  slug: string;
  title: string;
  publicGroupList: Array<{
    name: string;
    monitorList: UptimeMonitor[];
  }>;
}

/**
 * Fetch all monitors from Uptime Kuma status page
 *
 * This uses the public status page API endpoint which doesn't require authentication.
 * The status page must be created and published first using the setup script:
 *   npm run setup:uptime-kuma
 *
 * Status Page API Endpoint: /api/status-page/:slug
 * Returns heartbeat data and uptime statistics for all monitors on the page.
 */
export async function getUptimeMonitors(): Promise<UptimeMonitor[]> {
  try {
    // Use the public status page API endpoint
    // This requires a status page to be created with slug "firefetch"
    const statusPageSlug = 'firefetch';
    const response = await fetch(
      `${config.uptimeKuma.baseUrl}/api/status-page/${statusPageSlug}`,
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      // If status page doesn't exist yet, return empty array
      if (response.status === 404) {
        console.warn(
          'Uptime Kuma status page not found. Run "npm run setup:uptime-kuma" to create it.'
        );
        return [];
      }
      throw new Error(`Uptime Kuma API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract monitors from the status page response
    const monitors: UptimeMonitor[] = [];

    if (data.config && data.config.publicGroupList) {
      for (const group of data.config.publicGroupList) {
        if (group.monitorList) {
          for (const monitor of group.monitorList) {
            // Get heartbeat data for this monitor
            const heartbeatList = data.heartbeatList?.[monitor.id] || [];
            const uptimeData = data.uptimeList?.[monitor.id] || [];

            // Calculate statistics
            const latestHeartbeat = heartbeatList.length > 0
              ? heartbeatList[heartbeatList.length - 1]
              : null;

            const uptime24h = uptimeData.length > 0
              ? uptimeData[uptimeData.length - 1]?.uptime || 0
              : 0;

            // Calculate average ping from recent heartbeats
            const recentHeartbeats = heartbeatList.slice(-10);
            const avgPing = recentHeartbeats.length > 0
              ? Math.round(
                  recentHeartbeats.reduce((sum: number, hb: any) => sum + (hb.ping || 0), 0) /
                  recentHeartbeats.length
                )
              : 0;

            monitors.push({
              id: monitor.id,
              name: monitor.name,
              url: monitor.url || '',
              type: monitor.type || 'http',
              active: monitor.active !== false,
              uptime24h: uptime24h * 100, // Convert to percentage
              uptime: uptime24h * 100,
              avgPing,
              lastHeartbeat: latestHeartbeat ? {
                status: latestHeartbeat.status === 1,
                msg: latestHeartbeat.msg || '',
                ping: latestHeartbeat.ping || 0,
                time: latestHeartbeat.time,
              } : undefined,
            });
          }
        }
      }
    }

    return monitors;
  } catch (error) {
    console.error("Failed to fetch Uptime Kuma monitors:", error);
    return [];
  }
}

/**
 * Fetch monitor by ID
 */
export async function getUptimeMonitorById(id: number): Promise<UptimeMonitor | null> {
  try {
    const response = await fetch(`${config.uptimeKuma.baseUrl}/api/monitor/${id}`, {
      headers: {
        Authorization: config.uptimeKuma.apiKey,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Uptime Kuma API error: ${response.status}`);
    }

    const data = await response.json();
    return data.monitor || null;
  } catch (error) {
    console.error(`Failed to fetch Uptime Kuma monitor ${id}:`, error);
    return null;
  }
}

/**
 * Fetch heartbeats for a monitor
 */
export async function getMonitorHeartbeats(monitorId: number, hours = 24): Promise<UptimeHeartbeat[]> {
  try {
    const response = await fetch(
      `${config.uptimeKuma.baseUrl}/api/heartbeats/${monitorId}?hours=${hours}`,
      {
        headers: {
          Authorization: config.uptimeKuma.apiKey,
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      throw new Error(`Uptime Kuma API error: ${response.status}`);
    }

    const data = await response.json();
    return data.heartbeats || [];
  } catch (error) {
    console.error(`Failed to fetch heartbeats for monitor ${monitorId}:`, error);
    return [];
  }
}

/**
 * Calculate uptime percentage from heartbeats
 */
export function calculateUptime(heartbeats: UptimeHeartbeat[]): number {
  if (heartbeats.length === 0) return 0;

  const upCount = heartbeats.filter((hb) => hb.status).length;
  return (upCount / heartbeats.length) * 100;
}

/**
 * Calculate average ping from heartbeats
 */
export function calculateAveragePing(heartbeats: UptimeHeartbeat[]): number {
  if (heartbeats.length === 0) return 0;

  const validHeartbeats = heartbeats.filter((hb) => hb.ping > 0);
  if (validHeartbeats.length === 0) return 0;

  const sum = validHeartbeats.reduce((acc, hb) => acc + hb.ping, 0);
  return Math.round(sum / validHeartbeats.length);
}

/**
 * Get monitor status from Uptime Kuma and map to our status type
 */
export function mapUptimeStatus(
  monitor: UptimeMonitor
): "online" | "offline" | "degraded" | "unknown" {
  if (!monitor.active) return "unknown";

  if (monitor.lastHeartbeat) {
    if (monitor.lastHeartbeat.status) {
      // Check if uptime is below 95%
      const uptime = monitor.uptime24h || monitor.uptime || 100;
      if (uptime < 95) return "degraded";
      return "online";
    }
    return "offline";
  }

  return "unknown";
}

/**
 * Fetch uptime data for a specific URL
 * This matches the URL from our services.json to find the corresponding monitor
 */
export async function getUptimeForUrl(url: string): Promise<{
  status: "online" | "offline" | "degraded" | "unknown";
  uptime: number;
  responseTime: number;
  lastChecked?: Date;
} | null> {
  try {
    const monitors = await getUptimeMonitors();

    // Try to find a monitor matching this URL
    const monitor = monitors.find((m) => {
      // Normalize URLs for comparison
      const monitorUrl = m.url?.toLowerCase().replace(/\/$/, "");
      const targetUrl = url.toLowerCase().replace(/\/$/, "");
      return monitorUrl === targetUrl;
    });

    if (!monitor) {
      return null;
    }

    const status = mapUptimeStatus(monitor);
    const uptime = monitor.uptime24h || monitor.uptime || 0;
    const responseTime = monitor.avgPing || monitor.lastHeartbeat?.ping || 0;
    const lastChecked = monitor.lastHeartbeat?.time
      ? new Date(monitor.lastHeartbeat.time)
      : undefined;

    return {
      status,
      uptime,
      responseTime,
      lastChecked,
    };
  } catch (error) {
    console.error(`Failed to get uptime for URL ${url}:`, error);
    return null;
  }
}

/**
 * Get overall uptime statistics across all monitors
 */
export async function getOverallUptimeStats(): Promise<{
  averageUptime: number;
  totalMonitors: number;
  onlineMonitors: number;
  offlineMonitors: number;
  degradedMonitors: number;
}> {
  try {
    const monitors = await getUptimeMonitors();
    const activeMonitors = monitors.filter((m) => m.active);

    let totalUptime = 0;
    let onlineCount = 0;
    let offlineCount = 0;
    let degradedCount = 0;

    activeMonitors.forEach((monitor) => {
      const status = mapUptimeStatus(monitor);
      const uptime = monitor.uptime24h || monitor.uptime || 0;
      totalUptime += uptime;

      if (status === "online") onlineCount++;
      else if (status === "offline") offlineCount++;
      else if (status === "degraded") degradedCount++;
    });

    const averageUptime = activeMonitors.length > 0
      ? totalUptime / activeMonitors.length
      : 0;

    return {
      averageUptime,
      totalMonitors: activeMonitors.length,
      onlineMonitors: onlineCount,
      offlineMonitors: offlineCount,
      degradedMonitors: degradedCount,
    };
  } catch (error) {
    console.error("Failed to calculate overall uptime stats:", error);
    return {
      averageUptime: 0,
      totalMonitors: 0,
      onlineMonitors: 0,
      offlineMonitors: 0,
      degradedMonitors: 0,
    };
  }
}
