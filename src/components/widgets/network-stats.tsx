"use client";

import { memo, useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, ArrowUp, ArrowDown, Activity } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface NetworkStatsProps {
  upload: number; // bytes per second
  download: number; // bytes per second
  connections?: number;
}

interface NetworkDataPoint {
  timestamp: number;
  upload: number;
  download: number;
}

export const NetworkStats = memo(function NetworkStats({
  upload,
  download,
  connections = 0,
}: NetworkStatsProps) {
  const [history, setHistory] = useState<NetworkDataPoint[]>([]);
  const maxDataPoints = 30;

  useEffect(() => {
    // Add current data point to history
    setHistory((prev) => {
      const newPoint: NetworkDataPoint = {
        timestamp: Date.now(),
        upload,
        download,
      };
      return [...prev, newPoint].slice(-maxDataPoints);
    });
  }, [upload, download]);

  // Calculate max value for scaling the graph
  const maxValue = Math.max(
    ...history.map((p) => Math.max(p.upload, p.download)),
    1024 * 1024 // Minimum 1MB/s for scale
  );

  // Calculate average speeds
  const avgUpload =
    history.length > 0 ? history.reduce((sum, p) => sum + p.upload, 0) / history.length : 0;
  const avgDownload =
    history.length > 0 ? history.reduce((sum, p) => sum + p.download, 0) / history.length : 0;

  // Generate SVG path for sparkline
  const generatePath = (data: number[], color: string) => {
    if (data.length < 2) return null;

    const width = 100;
    const height = 40;
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (value / maxValue) * height;
      return `${x},${y}`;
    });

    return (
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300"
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          Network Statistics
        </CardTitle>
      </CardHeader>

      <div className="px-4 pb-4 space-y-6">
        {/* Current Speeds */}
        <div className="grid grid-cols-2 gap-4">
          {/* Upload */}
          <div className="p-4 rounded-lg bg-surface border border-border">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUp className="h-4 w-4 text-success" />
              <span className="text-xs text-text-muted uppercase tracking-wide">Upload</span>
            </div>
            <div className="text-2xl font-bold text-success">{formatBytes(upload)}/s</div>
            <div className="text-xs text-text-muted mt-1">
              Avg: {formatBytes(avgUpload)}/s
            </div>
          </div>

          {/* Download */}
          <div className="p-4 rounded-lg bg-surface border border-border">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDown className="h-4 w-4 text-primary" />
              <span className="text-xs text-text-muted uppercase tracking-wide">Download</span>
            </div>
            <div className="text-2xl font-bold text-primary">{formatBytes(download)}/s</div>
            <div className="text-xs text-text-muted mt-1">
              Avg: {formatBytes(avgDownload)}/s
            </div>
          </div>
        </div>

        {/* Graph */}
        {history.length > 1 && (
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wide mb-3">
              Throughput (Last {history.length} samples)
            </div>
            <div className="relative h-[120px] bg-surface rounded-lg border border-border p-4">
              <svg
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                {/* Grid lines */}
                <line
                  x1="0"
                  y1="0"
                  x2="100"
                  y2="0"
                  stroke="currentColor"
                  strokeWidth="0.2"
                  className="text-border"
                />
                <line
                  x1="0"
                  y1="20"
                  x2="100"
                  y2="20"
                  stroke="currentColor"
                  strokeWidth="0.2"
                  className="text-border"
                />
                <line
                  x1="0"
                  y1="40"
                  x2="100"
                  y2="40"
                  stroke="currentColor"
                  strokeWidth="0.2"
                  className="text-border"
                />

                {/* Download line (blue) */}
                {generatePath(
                  history.map((p) => p.download),
                  "#3b82f6"
                )}

                {/* Upload line (green) */}
                {generatePath(
                  history.map((p) => p.upload),
                  "#22c55e"
                )}
              </svg>

              {/* Legend */}
              <div className="absolute bottom-2 right-2 flex gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-primary"></div>
                  <span className="text-text-muted">Download</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-success"></div>
                  <span className="text-text-muted">Upload</span>
                </div>
              </div>

              {/* Max value indicator */}
              <div className="absolute top-2 left-2 text-xs text-text-muted">
                {formatBytes(maxValue)}/s
              </div>
            </div>
          </div>
        )}

        {/* Connection Count */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-surface border border-border">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-text-muted" />
            <span className="text-sm text-text-secondary">Active Connections</span>
          </div>
          <span className="text-lg font-semibold text-text-primary">{connections}</span>
        </div>

        {/* Total Bandwidth */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-text-muted mb-1">Total Up</div>
            <div className="text-sm font-semibold text-success">
              {formatBytes(upload + avgUpload)}/s
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Total Down</div>
            <div className="text-sm font-semibold text-primary">
              {formatBytes(download + avgDownload)}/s
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Combined</div>
            <div className="text-sm font-semibold text-text-primary">
              {formatBytes(upload + download)}/s
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});
