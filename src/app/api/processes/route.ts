import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

interface ProcessInfo {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  memory: number;
  memoryBytes: number;
  diskRead: number;
  diskWrite: number;
  command: string;
}

/**
 * Parse ps output into structured process data
 */
function parseProcessLine(line: string): ProcessInfo | null {
  try {
    // ps aux format: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
    const parts = line.trim().split(/\s+/);
    if (parts.length < 11) return null;

    const user = parts[0];
    const pid = parseInt(parts[1], 10);
    const cpu = parseFloat(parts[2]);
    const memory = parseFloat(parts[3]);
    const rss = parseInt(parts[5], 10) * 1024; // RSS in KB, convert to bytes
    const command = parts.slice(10).join(" ");
    const name = parts[10].split("/").pop() || parts[10];

    return {
      pid,
      name,
      user,
      cpu,
      memory,
      memoryBytes: rss,
      diskRead: 0, // Will be populated from /proc if available
      diskWrite: 0,
      command,
    };
  } catch {
    return null;
  }
}

/**
 * Get disk I/O stats for a process from /proc
 */
async function getDiskIO(pid: number): Promise<{ read: number; write: number }> {
  try {
    const { stdout } = await execAsync(`cat /proc/${pid}/io 2>/dev/null || echo ""`);
    if (!stdout) return { read: 0, write: 0 };

    const lines = stdout.split("\n");
    let read = 0;
    let write = 0;

    for (const line of lines) {
      if (line.startsWith("read_bytes:")) {
        read = parseInt(line.split(":")[1].trim(), 10);
      } else if (line.startsWith("write_bytes:")) {
        write = parseInt(line.split(":")[1].trim(), 10);
      }
    }

    return { read, write };
  } catch {
    return { read: 0, write: 0 };
  }
}

/**
 * Get top processes by CPU usage
 */
async function getTopProcessesByCpu(limit = 20): Promise<ProcessInfo[]> {
  try {
    const { stdout } = await execAsync(`ps aux --sort=-%cpu | head -n ${limit + 1}`);
    const lines = stdout.trim().split("\n").slice(1); // Skip header

    const processes: ProcessInfo[] = [];
    for (const line of lines) {
      const proc = parseProcessLine(line);
      if (proc) {
        // Try to get disk I/O (but don't block if unavailable)
        const io = await getDiskIO(proc.pid).catch(() => ({ read: 0, write: 0 }));
        proc.diskRead = io.read;
        proc.diskWrite = io.write;
        processes.push(proc);
      }
    }

    return processes;
  } catch (error) {
    console.error("Failed to get processes by CPU:", error);
    return [];
  }
}

/**
 * Get top processes by memory usage
 */
async function getTopProcessesByMemory(limit = 20): Promise<ProcessInfo[]> {
  try {
    const { stdout } = await execAsync(`ps aux --sort=-%mem | head -n ${limit + 1}`);
    const lines = stdout.trim().split("\n").slice(1); // Skip header

    const processes: ProcessInfo[] = [];
    for (const line of lines) {
      const proc = parseProcessLine(line);
      if (proc) {
        // Try to get disk I/O (but don't block if unavailable)
        const io = await getDiskIO(proc.pid).catch(() => ({ read: 0, write: 0 }));
        proc.diskRead = io.read;
        proc.diskWrite = io.write;
        processes.push(proc);
      }
    }

    return processes;
  } catch (error) {
    console.error("Failed to get processes by memory:", error);
    return [];
  }
}

/**
 * Get all processes (combined top CPU and memory)
 */
async function getAllProcesses(limit = 20): Promise<ProcessInfo[]> {
  try {
    // Get more processes and deduplicate
    const cpuProcs = await getTopProcessesByCpu(limit);
    const memProcs = await getTopProcessesByMemory(limit);

    // Combine and deduplicate by PID
    const processMap = new Map<number, ProcessInfo>();

    for (const proc of [...cpuProcs, ...memProcs]) {
      if (!processMap.has(proc.pid)) {
        processMap.set(proc.pid, proc);
      }
    }

    // Sort by CPU usage by default
    return Array.from(processMap.values())
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, limit);
  } catch (error) {
    console.error("Failed to get all processes:", error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sort") || "cpu"; // cpu, memory, name, pid
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let processes: ProcessInfo[] = [];

    // Get processes based on sort parameter
    if (sortBy === "memory") {
      processes = await getTopProcessesByMemory(limit);
    } else if (sortBy === "cpu") {
      processes = await getTopProcessesByCpu(limit);
    } else {
      // Get all and sort client-side or by specified field
      processes = await getAllProcesses(limit);

      // Apply custom sorting
      if (sortBy === "name") {
        processes.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortBy === "pid") {
        processes.sort((a, b) => a.pid - b.pid);
      }
    }

    // Get total process count
    const { stdout: wcOutput } = await execAsync("ps aux | wc -l");
    const totalProcesses = parseInt(wcOutput.trim(), 10) - 1; // Subtract header line

    return NextResponse.json({
      processes,
      timestamp: new Date().toISOString(),
      totalProcesses,
      limit,
      sort: sortBy,
    });
  } catch (error) {
    console.error("Failed to fetch process metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch process metrics" },
      { status: 500 }
    );
  }
}
