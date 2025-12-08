import { NextResponse } from "next/server";
import {
  getUptimeMonitors,
  getOverallUptimeStats,
  mapUptimeStatus,
} from "@/lib/uptime-kuma";

export const dynamic = "force-dynamic";

interface MonitorResponse {
  id: number;
  name: string;
  url: string;
  status: "online" | "offline" | "degraded" | "unknown";
  uptime24h: number;
  uptime30d?: number;
  avgPing: number;
  lastChecked?: string;
}

interface UptimeResponse {
  overall: {
    averageUptime: number;
    totalMonitors: number;
    onlineMonitors: number;
    offlineMonitors: number;
    degradedMonitors: number;
  };
  monitors: MonitorResponse[];
  lastUpdated: string;
}

/**
 * GET /api/uptime
 * Fetches all monitors and overall uptime statistics from Uptime Kuma
 */
export async function GET() {
  try {
    // Fetch monitors and overall stats in parallel
    const [monitors, overallStats] = await Promise.all([
      getUptimeMonitors(),
      getOverallUptimeStats(),
    ]);

    // Transform monitors to our response format
    const monitorResponses: MonitorResponse[] = monitors
      .filter((m) => m.active) // Only include active monitors
      .map((monitor) => ({
        id: monitor.id,
        name: monitor.name,
        url: monitor.url || "",
        status: mapUptimeStatus(monitor),
        uptime24h: monitor.uptime24h || monitor.uptime || 0,
        uptime30d: monitor.uptime30d,
        avgPing: monitor.avgPing || monitor.lastHeartbeat?.ping || 0,
        lastChecked: monitor.lastHeartbeat?.time,
      }));

    const response: UptimeResponse = {
      overall: overallStats,
      monitors: monitorResponses,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch uptime data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch uptime data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
