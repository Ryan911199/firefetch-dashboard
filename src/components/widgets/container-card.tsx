"use client";

import { memo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatUptime } from "@/lib/utils";
import { Container, ArrowUpDown, RotateCcw } from "lucide-react";

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "restarting" | "paused";
  uptime?: number;
  cpu: number;
  memory: { used: number; limit: number };
  network?: { rx: number; tx: number };
}

interface ContainerCardProps {
  container: DockerContainer;
  onRestart?: (id: string) => void;
}

export const ContainerCard = memo(function ContainerCard({ container, onRestart }: ContainerCardProps) {
  const statusMap: Record<string, "online" | "offline" | "degraded" | "unknown"> = {
    running: "online",
    stopped: "offline",
    restarting: "degraded",
    paused: "degraded",
  };

  const memoryPercent = (container.memory.used / container.memory.limit) * 100;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:bg-surface">
      <StatusDot status={statusMap[container.status]} pulse={container.status === "running"} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary truncate">{container.name}</span>
          {container.uptime && container.status === "running" && (
            <span className="text-xs text-text-muted">Up {formatUptime(container.uptime)}</span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-4">
          {/* CPU */}
          <div className="flex items-center gap-2 min-w-[100px]">
            <span className="text-xs text-text-muted w-8">CPU</span>
            <Progress value={container.cpu} size="sm" className="flex-1" />
            <span className="text-xs text-text-secondary w-10 text-right">
              {container.cpu.toFixed(1)}%
            </span>
          </div>

          {/* Memory */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-xs text-text-muted w-8">MEM</span>
            <Progress value={memoryPercent} size="sm" className="flex-1" />
            <span className="text-xs text-text-secondary w-16 text-right">
              {formatBytes(container.memory.used)}
            </span>
          </div>

          {/* Network */}
          {container.network && (
            <div className="hidden items-center gap-1 text-xs text-text-muted lg:flex">
              <ArrowUpDown className="h-3 w-3" />
              <span className="text-success">↑{formatBytes(container.network.tx)}/s</span>
              <span className="text-primary">↓{formatBytes(container.network.rx)}/s</span>
            </div>
          )}
        </div>
      </div>

      {onRestart && container.status === "running" && (
        <button
          onClick={() => onRestart(container.id)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-border hover:text-text-primary"
          title="Restart container"
          aria-label={`Restart ${container.name} container`}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
});

interface ContainerListProps {
  containers: DockerContainer[];
  onRestart?: (id: string) => void;
  limit?: number;
}

export const ContainerList = memo(function ContainerList({ containers, onRestart, limit }: ContainerListProps) {
  const displayContainers = limit ? containers.slice(0, limit) : containers;
  const remaining = limit ? containers.length - limit : 0;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Container className="h-4 w-4" />
          Docker Containers
        </CardTitle>
        <span className="text-sm text-text-muted">
          {containers.filter((c) => c.status === "running").length}/{containers.length} running
        </span>
      </CardHeader>

      <div className="space-y-2">
        {displayContainers.map((container) => (
          <ContainerCard key={container.id} container={container} onRestart={onRestart} />
        ))}
      </div>

      {remaining > 0 && (
        <button
          className="mt-3 w-full rounded-lg border border-border py-2 text-sm text-text-secondary transition-colors hover:bg-border/50 hover:text-text-primary"
          aria-label={`View all ${containers.length} containers`}
        >
          View all {containers.length} containers
        </button>
      )}
    </Card>
  );
});
