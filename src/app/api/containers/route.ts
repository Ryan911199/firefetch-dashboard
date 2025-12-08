import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getContainersCache, setContainersCache } from "@/lib/cache-manager";

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

interface ContainerStats {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "restarting" | "paused";
  uptime?: number;
  cpu: number;
  memory: {
    used: number;
    limit: number;
  };
}

function parseDockerStats(statsOutput: string): Map<string, { cpu: number; memUsed: number; memLimit: number }> {
  const stats = new Map();
  const lines = statsOutput.trim().split("\n").slice(1);

  for (const line of lines) {
    const parts = line.split(/\s{2,}/);
    if (parts.length >= 4) {
      const name = parts[1];
      const cpuStr = parts[2].replace("%", "");
      const memParts = parts[3].split(" / ");

      stats.set(name, {
        cpu: parseFloat(cpuStr) || 0,
        memUsed: parseMemory(memParts[0]),
        memLimit: parseMemory(memParts[1]),
      });
    }
  }

  return stats;
}

function parseMemory(memStr: string): number {
  const match = memStr.match(/^([\d.]+)([KMGTP]?i?B?)$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    KIB: 1024,
    MB: 1024 ** 2,
    MIB: 1024 ** 2,
    GB: 1024 ** 3,
    GIB: 1024 ** 3,
    TB: 1024 ** 4,
    TIB: 1024 ** 4,
  };

  return value * (multipliers[unit] || 1);
}

function parseUptime(statusStr: string): number | undefined {
  const match = statusStr.match(/Up\s+(?:(\d+)\s+days?,?\s*)?(?:(\d+)\s+hours?,?\s*)?(?:(\d+)\s+minutes?,?\s*)?(?:(\d+)\s+seconds?)?/i);
  if (!match) return undefined;

  const days = parseInt(match[1] || "0", 10);
  const hours = parseInt(match[2] || "0", 10);
  const minutes = parseInt(match[3] || "0", 10);
  const seconds = parseInt(match[4] || "0", 10);

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

async function fetchFreshContainers(): Promise<ContainerStats[]> {
  // Get container list
  const { stdout: psOutput } = await execAsync(
    'docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}"'
  );

  // Get container stats
  const { stdout: statsOutput } = await execAsync(
    "docker stats --no-stream --format 'table {{.ID}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'"
  );

  const statsMap = parseDockerStats(statsOutput);

  const containers: ContainerStats[] = [];

  for (const line of psOutput.trim().split("\n")) {
    if (!line) continue;

    const [id, name, image, ...statusParts] = line.split("\t");
    const statusStr = statusParts.join("\t");

    let status: "running" | "stopped" | "restarting" | "paused" = "stopped";
    if (statusStr.includes("Up")) status = "running";
    else if (statusStr.includes("Restarting")) status = "restarting";
    else if (statusStr.includes("Paused")) status = "paused";

    const stats = statsMap.get(name) || { cpu: 0, memUsed: 0, memLimit: 0 };

    containers.push({
      id: id.substring(0, 12),
      name,
      image,
      status,
      uptime: parseUptime(statusStr),
      cpu: stats.cpu,
      memory: {
        used: stats.memUsed,
        limit: stats.memLimit || 1073741824,
      },
    });
  }

  // Sort: running first, then by name
  containers.sort((a, b) => {
    if (a.status === "running" && b.status !== "running") return -1;
    if (a.status !== "running" && b.status === "running") return 1;
    return a.name.localeCompare(b.name);
  });

  return containers;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getContainersCache();
      if (cached && !cached.stale) {
        return NextResponse.json({
          containers: cached.data,
          cached: true,
          cacheAge: Date.now() - cached.timestamp,
        });
      }
    }

    // Fetch fresh containers
    const containers = await fetchFreshContainers();

    // Update cache
    setContainersCache(containers);

    return NextResponse.json({ containers });
  } catch (error) {
    console.error("Failed to fetch containers:", error);

    // Try to return stale cache if available
    const cached = getContainersCache();
    if (cached) {
      return NextResponse.json({
        containers: cached.data,
        cached: true,
        stale: true,
        cacheAge: Date.now() - cached.timestamp,
      });
    }

    return NextResponse.json({ error: "Failed to fetch containers" }, { status: 500 });
  }
}
