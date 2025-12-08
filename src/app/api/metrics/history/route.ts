import { NextResponse } from "next/server";
import { getMetricsHistory } from "@/lib/cache-manager";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const hoursParam = url.searchParams.get("hours");
    const hours = hoursParam ? parseInt(hoursParam, 10) : 24;

    const history = getMetricsHistory();

    // Filter by time range if requested
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const filtered = history.filter((point) => point.timestamp >= cutoff);

    return NextResponse.json({
      history: filtered,
      count: filtered.length,
      hours,
    });
  } catch (error) {
    console.error("Failed to fetch metrics history:", error);
    return NextResponse.json({ error: "Failed to fetch metrics history" }, { status: 500 });
  }
}
