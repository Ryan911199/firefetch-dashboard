"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HealthScoreProps {
  cpu: number;
  memory: { used: number; total: number };
  disk: { used: number; total: number };
  servicesOnline: number;
  totalServices: number;
}

export const HealthScore = memo(function HealthScore({
  cpu,
  memory,
  disk,
  servicesOnline,
  totalServices,
}: HealthScoreProps) {
  const score = useMemo(() => {
    // Calculate individual component scores (0-100)
    const cpuScore = Math.max(0, 100 - cpu);
    const memoryPercent = (memory.used / memory.total) * 100;
    const memoryScore = Math.max(0, 100 - memoryPercent);
    const diskPercent = (disk.used / disk.total) * 100;
    const diskScore = Math.max(0, 100 - diskPercent);
    const serviceScore = totalServices > 0 ? (servicesOnline / totalServices) * 100 : 100;

    // Weighted average: services are most important
    const weights = {
      cpu: 0.20,
      memory: 0.25,
      disk: 0.15,
      services: 0.40,
    };

    const totalScore =
      cpuScore * weights.cpu +
      memoryScore * weights.memory +
      diskScore * weights.disk +
      serviceScore * weights.services;

    return Math.round(totalScore);
  }, [cpu, memory, disk, servicesOnline, totalServices]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-error";
  };

  const getScoreGlow = (score: number): "success" | "primary" | "error" => {
    if (score >= 80) return "success";
    if (score >= 60) return "primary";
    return "error";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 70) return "Fair";
    if (score >= 60) return "Degraded";
    return "Critical";
  };

  const getTrendIcon = () => {
    // For now, just use the score to determine trend
    // In the future, this could compare with previous score
    if (score >= 80) return <TrendingUp className="h-4 w-4 text-success" />;
    if (score >= 60) return <Minus className="h-4 w-4 text-warning" />;
    return <TrendingDown className="h-4 w-4 text-error" />;
  };

  return (
    <Card glow={getScoreGlow(score)} className="relative overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          System Health Score
        </CardTitle>
      </CardHeader>

      <div className="flex flex-col items-center justify-center py-8">
        {/* Score Circle */}
        <div className="relative">
          <svg className="h-48 w-48 -rotate-90">
            {/* Background circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              className="stroke-border"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              className={getScoreColor(score).replace("text-", "stroke-")}
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 553} 553`}
              style={{
                filter: score >= 80 ? "drop-shadow(0 0 8px currentColor)" : "none",
              }}
            />
          </svg>

          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-bold ${getScoreColor(score)}`}>{score}</span>
            <span className="text-sm text-text-muted mt-1">/ 100</span>
          </div>
        </div>

        {/* Status label */}
        <div className="mt-6 flex items-center gap-2">
          {getTrendIcon()}
          <span className={`text-lg font-semibold ${getScoreColor(score)}`}>
            {getScoreLabel(score)}
          </span>
        </div>

        {/* Component breakdown */}
        <div className="mt-8 w-full grid grid-cols-2 gap-4 px-6">
          <div className="text-center">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">CPU</div>
            <div className="text-sm font-semibold">{Math.max(0, 100 - cpu).toFixed(0)}/100</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Memory</div>
            <div className="text-sm font-semibold">
              {Math.max(0, 100 - (memory.used / memory.total) * 100).toFixed(0)}/100
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Disk</div>
            <div className="text-sm font-semibold">
              {Math.max(0, 100 - (disk.used / disk.total) * 100).toFixed(0)}/100
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Services</div>
            <div className="text-sm font-semibold">
              {servicesOnline}/{totalServices}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});
