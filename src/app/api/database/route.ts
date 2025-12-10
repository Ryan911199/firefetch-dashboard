import { NextResponse } from "next/server";
import { getDatabaseStats, getDb, removeServiceData, getTrackedServiceIds } from "@/lib/database";
import { runAggregationNow } from "@/lib/aggregation-scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getDb();
    const stats = getDatabaseStats();
    const trackedServices = getTrackedServiceIds();

    return NextResponse.json({
      ...stats,
      dbSizeMB: (stats.dbSizeBytes / (1024 * 1024)).toFixed(2),
      trackedServices,
    });
  } catch (error) {
    console.error("Failed to get database stats:", error);
    return NextResponse.json({ error: "Failed to get database stats" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "aggregate") {
      const result = runAggregationNow();
      return NextResponse.json({
        success: true,
        message: "Aggregation completed",
        ...result,
      });
    }

    if (body.action === "cleanup" && body.serviceIds) {
      const result = removeServiceData(body.serviceIds);
      return NextResponse.json({
        success: true,
        message: `Removed data for ${body.serviceIds.length} services`,
        ...result,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to perform database action:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
