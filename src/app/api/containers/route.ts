import { NextResponse } from "next/server";
import { getLatestContainerStats, getContainerHistory, getDb } from "@/lib/database";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Ensure database is initialized
    getDb();

    const url = new URL(request.url);
    const containerId = url.searchParams.get("containerId");
    const hours = parseInt(url.searchParams.get("hours") || "24", 10);

    // If containerId is provided, return history for that container
    if (containerId) {
      const history = getContainerHistory(containerId, hours);
      return NextResponse.json({
        containerId,
        history: history.map((c) => ({
          timestamp: c.timestamp,
          cpu: c.cpu_percent,
          memory: {
            used: c.memory_used,
            limit: c.memory_limit,
          },
          status: c.status,
        })),
        count: history.length,
      });
    }

    // Otherwise, return latest stats for all containers
    const containers = getLatestContainerStats();

    // Transform to match existing frontend format
    const transformed = containers.map((c) => ({
      id: c.container_id,
      name: c.container_name,
      status: c.status,
      cpu: c.cpu_percent,
      memory: {
        used: c.memory_used,
        limit: c.memory_limit,
      },
      network: c.network_rx !== undefined ? {
        rx: c.network_rx,
        tx: c.network_tx,
      } : undefined,
    }));

    // Sort: running first, then by name
    transformed.sort((a, b) => {
      if (a.status === "running" && b.status !== "running") return -1;
      if (a.status !== "running" && b.status === "running") return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ containers: transformed });
  } catch (error) {
    console.error("Failed to fetch containers:", error);
    return NextResponse.json({ error: "Failed to fetch containers" }, { status: 500 });
  }
}
