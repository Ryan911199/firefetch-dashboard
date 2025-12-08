"use client";

import { memo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/progress";
import { Cpu, MemoryStick, HardDrive, Wifi } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface SystemMetricsProps {
  cpu: number;
  memory: { used: number; total: number };
  disk: { used: number; total: number };
  network: { up: number; down: number };
}

export const SystemMetrics = memo(function SystemMetrics({ cpu, memory, disk, network }: SystemMetricsProps) {
  const memoryPercent = (memory.used / memory.total) * 100;
  const diskPercent = (disk.used / disk.total) * 100;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>System Overview</CardTitle>
      </CardHeader>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {/* CPU */}
        <div className="flex flex-col items-center gap-3">
          <CircularProgress value={cpu} size={90} strokeWidth={8}>
            <div className="flex flex-col items-center">
              <Cpu className="h-4 w-4 text-text-muted mb-1" />
              <span className="text-lg font-semibold">{cpu.toFixed(0)}%</span>
            </div>
          </CircularProgress>
          <span className="text-sm font-medium text-text-secondary">CPU</span>
        </div>

        {/* Memory */}
        <div className="flex flex-col items-center gap-3">
          <CircularProgress value={memoryPercent} size={90} strokeWidth={8}>
            <div className="flex flex-col items-center">
              <MemoryStick className="h-4 w-4 text-text-muted mb-1" />
              <span className="text-lg font-semibold">{memoryPercent.toFixed(0)}%</span>
            </div>
          </CircularProgress>
          <div className="text-center">
            <span className="text-sm font-medium text-text-secondary">Memory</span>
            <p className="text-xs text-text-muted">
              {formatBytes(memory.used)} / {formatBytes(memory.total)}
            </p>
          </div>
        </div>

        {/* Disk */}
        <div className="flex flex-col items-center gap-3">
          <CircularProgress value={diskPercent} size={90} strokeWidth={8}>
            <div className="flex flex-col items-center">
              <HardDrive className="h-4 w-4 text-text-muted mb-1" />
              <span className="text-lg font-semibold">{diskPercent.toFixed(0)}%</span>
            </div>
          </CircularProgress>
          <div className="text-center">
            <span className="text-sm font-medium text-text-secondary">Disk</span>
            <p className="text-xs text-text-muted">
              {formatBytes(disk.used)} / {formatBytes(disk.total)}
            </p>
          </div>
        </div>

        {/* Network */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-[90px] w-[90px] items-center justify-center rounded-full border-8 border-border">
            <div className="flex flex-col items-center">
              <Wifi className="h-4 w-4 text-text-muted mb-1" />
              <span className="text-xs font-medium text-success">↑{formatBytes(network.up)}/s</span>
              <span className="text-xs font-medium text-primary">↓{formatBytes(network.down)}/s</span>
            </div>
          </div>
          <span className="text-sm font-medium text-text-secondary">Network</span>
        </div>
      </div>
    </Card>
  );
});
