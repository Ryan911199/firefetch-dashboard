import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import {
  getMetricsCache,
  setMetricsCache,
  shouldAddHistoryPoint,
  addMetricsHistoryPoint,
  checkResourceAlerts,
} from "@/lib/cache-manager";

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

interface SystemMetrics {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percent: number;
  };
  disk: {
    used: number;
    total: number;
    percent: number;
  };
  network: {
    up: number;
    down: number;
  };
  uptime: number;
  loadAverage: number[];
  cached?: boolean;
  cacheAge?: number;
}

// Store previous CPU stats for calculating usage over time
let prevCpuStats: { idle: number; total: number; timestamp: number } | null = null;

async function getCpuUsage(): Promise<number> {
  try {
    const { stdout } = await execAsync("head -1 /proc/stat");
    const parts = stdout.trim().split(/\s+/);
    const idle = parseInt(parts[4], 10) + parseInt(parts[5], 10);
    const total = parts.slice(1, 11).reduce((sum, val) => sum + parseInt(val, 10), 0);
    const now = Date.now();

    if (prevCpuStats && now - prevCpuStats.timestamp < 10000) {
      const idleDiff = idle - prevCpuStats.idle;
      const totalDiff = total - prevCpuStats.total;
      const usage = totalDiff > 0 ? 100 * (1 - idleDiff / totalDiff) : 0;

      prevCpuStats = { idle, total, timestamp: now };
      return Math.max(0, Math.min(100, usage));
    }

    prevCpuStats = { idle, total, timestamp: now };
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    return 100 - (100 * totalIdle) / totalTick;
  } catch {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    return 100 - (100 * totalIdle) / totalTick;
  }
}

async function getDiskUsage(): Promise<{ used: number; total: number; percent: number }> {
  try {
    const { stdout } = await execAsync("df -B1 / | tail -1 | awk '{print $2,$3,$5}'");
    const [total, used, percent] = stdout.trim().split(" ");
    return {
      total: parseInt(total, 10),
      used: parseInt(used, 10),
      percent: parseInt(percent.replace("%", ""), 10),
    };
  } catch {
    return { used: 0, total: 0, percent: 0 };
  }
}

let prevNetStats: { rx: number; tx: number; timestamp: number } | null = null;

async function getNetworkStats(): Promise<{ up: number; down: number }> {
  try {
    const now = Date.now();
    const { stdout } = await execAsync(
      "cat /proc/net/dev | grep -E 'eth0|ens|enp' | head -1 | awk '{print $2, $10}'"
    );
    const [rx, tx] = stdout.trim().split(" ").map(Number);

    if (!rx || !tx) {
      return { up: 0, down: 0 };
    }

    if (prevNetStats) {
      const timeDiff = (now - prevNetStats.timestamp) / 1000;
      if (timeDiff > 0) {
        const rxRate = Math.max(0, (rx - prevNetStats.rx) / timeDiff);
        const txRate = Math.max(0, (tx - prevNetStats.tx) / timeDiff);

        prevNetStats = { rx, tx, timestamp: now };
        return { down: rxRate, up: txRate };
      }
    }

    prevNetStats = { rx, tx, timestamp: now };
    return { up: 0, down: 0 };
  } catch {
    return { up: 0, down: 0 };
  }
}

async function fetchFreshMetrics(): Promise<SystemMetrics> {
  const [cpu, disk, network] = await Promise.all([
    getCpuUsage(),
    getDiskUsage(),
    getNetworkStats(),
  ]);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    cpu,
    memory: {
      used: usedMem,
      total: totalMem,
      percent: (usedMem / totalMem) * 100,
    },
    disk,
    network,
    uptime: os.uptime(),
    loadAverage: os.loadavg(),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getMetricsCache();
      if (cached && !cached.stale) {
        return NextResponse.json({
          ...cached.data,
          cached: true,
          cacheAge: Date.now() - cached.timestamp,
        });
      }
    }

    // Fetch fresh metrics
    const metrics = await fetchFreshMetrics();

    // Update cache
    setMetricsCache(metrics);

    // Add to history if enough time has passed
    if (shouldAddHistoryPoint()) {
      addMetricsHistoryPoint({
        cpu: metrics.cpu,
        memoryPercent: metrics.memory.percent,
        diskPercent: metrics.disk.percent,
        networkUp: metrics.network.up,
        networkDown: metrics.network.down,
      });
    }

    // Check for resource alerts
    checkResourceAlerts(metrics);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to fetch metrics:", error);

    // Try to return stale cache if available
    const cached = getMetricsCache();
    if (cached) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        stale: true,
        cacheAge: Date.now() - cached.timestamp,
      });
    }

    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
