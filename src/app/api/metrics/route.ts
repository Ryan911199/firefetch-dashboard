import { NextResponse } from "next/server";
import { getLatestMetrics, getDb } from "@/lib/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Ensure database is initialized
    getDb();

    const metrics = getLatestMetrics();

    if (!metrics) {
      // Return placeholder data if no metrics yet
      return NextResponse.json({
        cpu: 0,
        memory: { used: 0, total: 1, percent: 0 },
        disk: { used: 0, total: 1, percent: 0 },
        network: { up: 0, down: 0 },
        uptime: 0,
        loadAverage: [0, 0, 0],
      });
    }

    // Transform to match the existing frontend format
    return NextResponse.json({
      cpu: metrics.cpu_percent,
      memory: {
        used: metrics.memory_used,
        total: metrics.memory_total,
        percent: metrics.memory_percent,
      },
      disk: {
        used: metrics.disk_used,
        total: metrics.disk_total,
        percent: metrics.disk_percent,
      },
      network: {
        up: metrics.network_tx,
        down: metrics.network_rx,
      },
      uptime: metrics.uptime || 0,
      loadAverage: [
        metrics.load_1m || 0,
        metrics.load_5m || 0,
        metrics.load_15m || 0,
      ],
      timestamp: metrics.timestamp,
    });
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
