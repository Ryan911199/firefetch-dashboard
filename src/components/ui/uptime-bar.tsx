"use client";

import { useMemo } from "react";

interface UptimeEntry {
  status: string;
  timestamp?: number;
}

interface UptimeBarProps {
  history: UptimeEntry[];
  maxBars?: number;
  height?: "sm" | "md" | "lg";
  showDayLabels?: boolean;
  className?: string;
}

export function UptimeBar({
  history,
  maxBars = 90,
  height = "md",
  showDayLabels = false,
  className = "",
}: UptimeBarProps) {
  const bars = useMemo(() => {
    return history.slice(-maxBars);
  }, [history, maxBars]);

  const heightClass = {
    sm: "h-6",
    md: "h-8",
    lg: "h-10",
  }[height];

  const getBarColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
        return "bg-green-500 hover:bg-green-400";
      case "degraded":
        return "bg-yellow-500 hover:bg-yellow-400";
      case "offline":
        return "bg-red-500 hover:bg-red-400";
      default:
        return "bg-gray-500 hover:bg-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Calculate time labels for display
  const dayMarkers = useMemo(() => {
    if (!showDayLabels || bars.length === 0) return [];

    const markers: { index: number; label: string }[] = [];
    const now = Date.now();
    const msPerBar = (24 * 60 * 60 * 1000) / maxBars; // Approximate time per bar

    // Show markers at day boundaries
    for (let i = 0; i < bars.length; i += Math.floor(maxBars / 7)) {
      const timestamp = now - (bars.length - i) * msPerBar;
      const date = new Date(timestamp);
      markers.push({
        index: i,
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }

    return markers;
  }, [bars, maxBars, showDayLabels]);

  if (bars.length === 0) {
    return (
      <div className={`text-text-secondary text-sm ${className}`}>
        No uptime data available yet
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={`flex gap-[2px] ${heightClass} items-end`}>
        {bars.map((entry, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${getBarColor(entry.status)} transition-all cursor-pointer`}
            title={`${getStatusLabel(entry.status)}${
              entry.timestamp
                ? ` - ${new Date(entry.timestamp).toLocaleString()}`
                : ""
            }`}
          />
        ))}
      </div>

      {showDayLabels && dayMarkers.length > 0 && (
        <div className="flex justify-between mt-2 text-[10px] text-text-secondary">
          {dayMarkers.map((marker) => (
            <div key={marker.index}>{marker.label}</div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>Online</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-yellow-500" />
          <span>Degraded</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span>Offline</span>
        </div>
        <div className="ml-auto text-text-muted">
          Last {bars.length} checks
        </div>
      </div>
    </div>
  );
}
