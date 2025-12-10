import { NextResponse } from "next/server";
import { getMetricsHistory, getDb } from "@/lib/database";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Ensure database is initialized
    getDb();

    const url = new URL(request.url);
    const hoursParam = url.searchParams.get("hours");
    const resolutionParam = url.searchParams.get("resolution");

    const hours = hoursParam ? parseInt(hoursParam, 10) : 24;

    // Determine resolution based on time range if not specified
    let resolution: 'live' | 'hourly' | 'daily' = 'live';
    if (resolutionParam) {
      resolution = resolutionParam as 'live' | 'hourly' | 'daily';
    } else if (hours > 168) { // > 7 days
      resolution = 'daily';
    } else if (hours > 24) { // > 1 day
      resolution = 'hourly';
    }

    const history = getMetricsHistory(hours, resolution);

    // Transform to match existing frontend format
    const transformed = history.map((point) => ({
      timestamp: point.timestamp,
      cpu: point.cpu_percent,
      memoryPercent: point.memory_percent,
      diskPercent: point.disk_percent,
      networkUp: point.network_tx,
      networkDown: point.network_rx,
    }));

    return NextResponse.json({
      history: transformed,
      count: transformed.length,
      hours,
      resolution,
    });
  } catch (error) {
    console.error("Failed to fetch metrics history:", error);
    return NextResponse.json({ error: "Failed to fetch metrics history" }, { status: 500 });
  }
}
