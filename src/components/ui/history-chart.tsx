"use client";

import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/utils";

interface MetricsHistoryPoint {
  timestamp: number;
  cpu: number;
  memoryPercent: number;
  diskPercent: number;
  networkUp: number;
  networkDown: number;
}

interface HistoryChartProps {
  type: "cpu" | "memory" | "disk" | "network";
  hours?: number;
  height?: number;
  className?: string;
}

export function HistoryChart({
  type,
  hours = 6,
  height = 120,
  className = "",
}: HistoryChartProps) {
  const [history, setHistory] = useState<MetricsHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/metrics/history?hours=${hours}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error("Failed to fetch metrics history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
    // Refresh every 5 minutes
    const interval = setInterval(fetchHistory, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hours]);

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} style={{ height }} />
    );
  }

  if (history.length < 2) {
    return (
      <div className={`flex items-center justify-center text-gray-500 text-xs bg-black/20 rounded-xl ${className}`} style={{ height }}>
        Collecting data...
      </div>
    );
  }

  // Get data based on type
  const getData = () => {
    switch (type) {
      case "cpu":
        return history.map((p) => p.cpu);
      case "memory":
        return history.map((p) => p.memoryPercent);
      case "disk":
        return history.map((p) => p.diskPercent);
      case "network":
        return history.map((p) => p.networkDown);
      default:
        return [];
    }
  };

  const data = getData();
  const max = Math.max(...data, type === "network" ? 1024 : 100);
  const min = 0;

  // Generate path
  const width = 300;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / (max - min)) * height * 0.9 - height * 0.05;
    return `${x},${y}`;
  }).join(" ");

  // Colors based on type
  const colors = {
    cpu: { line: "#3b82f6", fill: "#3b82f6" },
    memory: "#8b5cf6",
    disk: "#10b981",
    network: "#06b6d4",
  };

  const color = type === "cpu" ? colors.cpu.line : colors[type];
  const gradientId = `history-gradient-${type}`;

  // Stats
  const current = data[data.length - 1];
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const maxVal = Math.max(...data);

  const formatValue = (val: number) => {
    if (type === "network") {
      return formatBytes(val) + "/s";
    }
    return val.toFixed(1) + "%";
  };

  return (
    <div className={className}>
      {/* Chart */}
      <div className="relative" style={{ height }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="white" strokeOpacity="0.05" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="white" strokeOpacity="0.05" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="white" strokeOpacity="0.05" />

          {/* Area fill */}
          <path
            d={`M 0 ${height} L ${points} L ${width} ${height} Z`}
            fill={`url(#${gradientId})`}
          />

          {/* Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current value dot */}
          {data.length > 0 && (
            <circle
              cx={width}
              cy={height - ((current - min) / (max - min)) * height * 0.9 - height * 0.05}
              r="4"
              fill={color}
              className="drop-shadow-md"
            />
          )}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-500 font-mono pointer-events-none">
          <span>{type === "network" ? formatBytes(max) : `${max}%`}</span>
          <span>{type === "network" ? formatBytes(max / 2) : "50%"}</span>
          <span>0</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-3 text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-gray-500 mr-1">Current:</span>
            <span className="text-white font-mono">{formatValue(current)}</span>
          </div>
          <div>
            <span className="text-gray-500 mr-1">Avg:</span>
            <span className="text-white font-mono">{formatValue(avg)}</span>
          </div>
          <div>
            <span className="text-gray-500 mr-1">Max:</span>
            <span className="text-white font-mono">{formatValue(maxVal)}</span>
          </div>
        </div>
        <span className="text-gray-600">{hours}h history</span>
      </div>
    </div>
  );
}
