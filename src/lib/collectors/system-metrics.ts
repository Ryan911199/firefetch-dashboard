/**
 * System Metrics Collection
 * 
 * Collects CPU, memory, disk, and network statistics.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { type MetricsSnapshot } from '../database';

const execAsync = promisify(exec);

// Store previous values for rate calculations
let prevCpuStats: { idle: number; total: number; timestamp: number } | null = null;
let prevNetStats: { rx: number; tx: number; timestamp: number } | null = null;

export async function getCpuUsage(): Promise<number> {
  try {
    const { stdout } = await execAsync('head -1 /proc/stat');
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

export async function getDiskUsage(): Promise<{ used: number; total: number; percent: number }> {
  try {
    const { stdout } = await execAsync("df -B1 / | tail -1 | awk '{print $2,$3,$5}'");
    const [total, used, percent] = stdout.trim().split(' ');
    return {
      total: parseInt(total, 10),
      used: parseInt(used, 10),
      percent: parseInt(percent.replace('%', ''), 10),
    };
  } catch {
    return { used: 0, total: 0, percent: 0 };
  }
}

export async function getNetworkStats(): Promise<{ rx: number; tx: number }> {
  try {
    const now = Date.now();
    const { stdout } = await execAsync(
      "cat /proc/net/dev | grep -E 'eth0|ens|enp' | head -1 | awk '{print $2, $10}'"
    );
    const [rx, tx] = stdout.trim().split(' ').map(Number);

    if (!rx || !tx) {
      return { rx: 0, tx: 0 };
    }

    if (prevNetStats) {
      const timeDiff = (now - prevNetStats.timestamp) / 1000;
      if (timeDiff > 0) {
        const rxRate = Math.max(0, (rx - prevNetStats.rx) / timeDiff);
        const txRate = Math.max(0, (tx - prevNetStats.tx) / timeDiff);
        prevNetStats = { rx, tx, timestamp: now };
        return { rx: rxRate, tx: txRate };
      }
    }

    prevNetStats = { rx, tx, timestamp: now };
    return { rx: 0, tx: 0 };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

export async function collectSystemMetricsData(): Promise<MetricsSnapshot> {
  const [cpu, disk, network] = await Promise.all([
    getCpuUsage(),
    getDiskUsage(),
    getNetworkStats(),
  ]);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const loadAvg = os.loadavg();
  const now = Date.now();

  return {
    timestamp: now,
    cpu_percent: cpu,
    memory_used: usedMem,
    memory_total: totalMem,
    memory_percent: (usedMem / totalMem) * 100,
    disk_used: disk.used,
    disk_total: disk.total,
    disk_percent: disk.percent,
    network_rx: network.rx,
    network_tx: network.tx,
    load_1m: loadAvg[0],
    load_5m: loadAvg[1],
    load_15m: loadAvg[2],
    uptime: os.uptime(),
  };
}
