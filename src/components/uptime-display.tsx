"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";

interface UptimeDisplayProps {
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  uptime90d?: number;
  selectedTimeframe: "24h" | "7d" | "30d" | "90d";
  className?: string;
}

export function UptimeDisplay({
  uptime24h,
  uptime7d,
  uptime30d,
  uptime90d,
  selectedTimeframe,
  className = "",
}: UptimeDisplayProps) {
  const currentUptime = useMemo(() => {
    switch (selectedTimeframe) {
      case "24h":
        return uptime24h;
      case "7d":
        return uptime7d;
      case "30d":
        return uptime30d;
      case "90d":
        return uptime90d ?? uptime30d;
      default:
        return uptime24h;
    }
  }, [selectedTimeframe, uptime24h, uptime7d, uptime30d, uptime90d]);

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return "text-emerald-400";
    if (uptime >= 99.0) return "text-green-400";
    if (uptime >= 95.0) return "text-yellow-400";
    if (uptime >= 90.0) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="w-4 h-4 text-text-secondary" />
      <span className={`font-semibold font-mono ${getUptimeColor(currentUptime)}`}>
        {currentUptime.toFixed(2)}%
      </span>
    </div>
  );
}
