"use client";

import { memo, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { Progress } from "@/components/ui/progress";
import { Activity, Clock, TrendingUp, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface Monitor {
  id: number;
  name: string;
  url: string;
  status: "online" | "offline" | "degraded" | "unknown";
  uptime24h: number;
  uptime30d?: number;
  avgPing: number;
  lastChecked?: string;
}

interface OverallStats {
  averageUptime: number;
  totalMonitors: number;
  onlineMonitors: number;
  offlineMonitors: number;
  degradedMonitors: number;
}

interface UptimeData {
  overall: OverallStats;
  monitors: Monitor[];
  lastUpdated: string;
}

export const UptimeStatus = memo(function UptimeStatus() {
  const [data, setData] = useState<UptimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUptimeData = async () => {
      try {
        const response = await fetch("/api/uptime");
        if (!response.ok) {
          throw new Error("Failed to fetch uptime data");
        }
        const uptimeData = await response.json();
        setData(uptimeData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Failed to fetch uptime data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUptimeData();
    const interval = setInterval(fetchUptimeData, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Uptime Status</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
          <p className="text-text-muted">Loading uptime data...</p>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Uptime Status</h2>
        </div>
        <div className="flex items-center gap-2 text-error">
          <AlertCircle className="h-5 w-5" />
          <p>Failed to load uptime data</p>
        </div>
      </Card>
    );
  }

  const { overall, monitors } = data;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Uptime Status</h2>
        </div>
        <div className="text-sm text-text-muted">
          Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 bg-surface-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted mb-1">Average Uptime</p>
              <p className="text-2xl font-bold text-text-primary">
                {overall.averageUptime.toFixed(2)}%
              </p>
            </div>
            <TrendingUp
              className={`h-8 w-8 ${
                overall.averageUptime >= 99
                  ? "text-success"
                  : overall.averageUptime >= 95
                  ? "text-warning"
                  : "text-error"
              }`}
            />
          </div>
          <Progress
            value={overall.averageUptime}
            size="sm"
            color={
              overall.averageUptime >= 99
                ? "success"
                : overall.averageUptime >= 95
                ? "warning"
                : "error"
            }
            className="mt-3"
          />
        </Card>

        <Card className="p-4 bg-surface-light">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Monitor Status</p>
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-lg font-bold text-text-primary">
                  {overall.onlineMonitors}
                </span>
              </div>
              <p className="text-xs text-text-muted">Online</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-lg font-bold text-text-primary">
                  {overall.degradedMonitors}
                </span>
              </div>
              <p className="text-xs text-text-muted">Degraded</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <XCircle className="h-4 w-4 text-error" />
                <span className="text-lg font-bold text-text-primary">
                  {overall.offlineMonitors}
                </span>
              </div>
              <p className="text-xs text-text-muted">Offline</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Monitors List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-secondary mb-3">
          Monitors ({monitors.length})
        </h3>
        {monitors.length === 0 ? (
          <p className="text-text-muted text-sm">No monitors configured</p>
        ) : (
          monitors.map((monitor) => (
            <Card key={monitor.id} className="p-4 bg-surface-light hover:glow-primary transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <StatusDot status={monitor.status} size="md" />
                  <div>
                    <h4 className="font-medium text-text-primary">{monitor.name}</h4>
                    <p className="text-xs text-text-muted">{monitor.url}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary">
                    {monitor.uptime24h.toFixed(2)}%
                  </p>
                  <p className="text-xs text-text-muted">24h uptime</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <Activity className="h-3.5 w-3.5" />
                  <span>{monitor.avgPing}ms</span>
                </div>
                {monitor.lastChecked && (
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(monitor.lastChecked).toLocaleTimeString()}</span>
                  </div>
                )}
                {monitor.uptime30d !== undefined && (
                  <div className="ml-auto text-sm text-text-muted">
                    30d: {monitor.uptime30d.toFixed(2)}%
                  </div>
                )}
              </div>

              <Progress
                value={monitor.uptime24h}
                size="sm"
                color={
                  monitor.uptime24h >= 99
                    ? "success"
                    : monitor.uptime24h >= 95
                    ? "warning"
                    : "error"
                }
                className="mt-3"
              />
            </Card>
          ))
        )}
      </div>
    </Card>
  );
});
