"use client";

import { useMemo } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CircularProgress } from "@/components/ui/progress";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";
import { Cpu, MemoryStick, HardDrive, Wifi, Activity, Clock, TrendingUp } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { useData } from "@/contexts/data-context";
import type { MetricsHistoryPoint } from "@/contexts/data-context";

export function MetricsContent() {
  const { metrics, metricsHistory: history, isRefreshing } = useData();

  const formatUptime = (seconds: number): string => {
    if (!seconds) return "0s";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // History chart component inline
  const HistoryChart = ({
    type,
    data,
    height = 100
  }: {
    type: "cpu" | "memory" | "disk" | "network";
    data: MetricsHistoryPoint[];
    height?: number;
  }) => {
    if (data.length < 2) {
      return (
        <div className="flex items-center justify-center text-gray-500 text-xs bg-black/20 rounded-xl" style={{ height }}>
          Collecting data...
        </div>
      );
    }

    const getData = () => {
      switch (type) {
        case "cpu": return data.map((p) => p.cpu);
        case "memory": return data.map((p) => p.memoryPercent);
        case "disk": return data.map((p) => p.diskPercent);
        case "network": return data.map((p) => p.networkDown);
        default: return [];
      }
    };

    const chartData = getData();
    const max = Math.max(...chartData, type === "network" ? 1024 : 100);
    const width = 300;

    const points = chartData.map((val, i) => {
      const x = (i / (chartData.length - 1)) * width;
      const y = height - ((val / max) * height * 0.9) - height * 0.05;
      return `${x},${y}`;
    }).join(" ");

    const colors: Record<string, string> = {
      cpu: "#3b82f6",
      memory: "#8b5cf6",
      disk: "#10b981",
      network: "#06b6d4",
    };

    const color = colors[type];
    const gradientId = `history-gradient-${type}`;
    const current = chartData[chartData.length - 1];
    const avg = chartData.reduce((a, b) => a + b, 0) / chartData.length;
    const maxVal = Math.max(...chartData);

    const formatValue = (val: number) => {
      if (type === "network") return formatBytes(val) + "/s";
      return val.toFixed(1) + "%";
    };

    return (
      <div>
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

            <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="white" strokeOpacity="0.05" />
            <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="white" strokeOpacity="0.05" />
            <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="white" strokeOpacity="0.05" />

            <path
              d={`M 0 ${height} L ${points} L ${width} ${height} Z`}
              fill={`url(#${gradientId})`}
            />

            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={points}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <circle
              cx={width}
              cy={height - ((current / max) * height * 0.9) - height * 0.05}
              r="4"
              fill={color}
              className="drop-shadow-md"
            />
          </svg>

          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-500 font-mono pointer-events-none">
            <span>{type === "network" ? formatBytes(max) : `${max}%`}</span>
            <span>{type === "network" ? formatBytes(max / 2) : "50%"}</span>
            <span>0</span>
          </div>
        </div>

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
          <span className="text-gray-600">6h history</span>
        </div>
      </div>
    );
  };

  // Filter history to last 6 hours
  const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
  const filteredHistory = history.filter(p => p.timestamp >= sixHoursAgo);

  return (
    <div className="flex h-screen bg-[#0f172a] text-gray-100 font-sans overflow-hidden selection:bg-purple-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] opacity-30" />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 lg:ml-64">
        {/* Header */}
        <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-6 z-10 shrink-0 mt-14 lg:mt-0">
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              System Metrics
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              Performance details and history
            </p>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">
                {isRefreshing ? 'Syncing' : 'Online'}
              </span>
            </div>
            <NotificationDropdown />
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-24 lg:pb-6 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-4 lg:space-y-6 animate-fade-in">
              {/* Large Circular Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {/* CPU Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl flex flex-col items-center">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <Cpu className="h-4 w-4 text-blue-400" />
                    <span className="text-[10px] lg:text-xs font-semibold uppercase tracking-wider">CPU</span>
                  </div>
                  <CircularProgress value={metrics?.cpu || 0} size={100} strokeWidth={10} color="accent">
                    <span className="text-xl lg:text-2xl font-bold text-white">{(metrics?.cpu || 0).toFixed(0)}%</span>
                  </CircularProgress>
                  {metrics?.loadAverage && (
                    <p className="mt-2 text-[10px] lg:text-xs text-gray-500 text-center">
                      Load: {metrics.loadAverage[0].toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Memory Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl flex flex-col items-center">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <MemoryStick className="h-4 w-4 text-purple-400" />
                    <span className="text-[10px] lg:text-xs font-semibold uppercase tracking-wider">Memory</span>
                  </div>
                  <CircularProgress value={metrics?.memory.percent || 0} size={100} strokeWidth={10} color="accent">
                    <span className="text-xl lg:text-2xl font-bold text-white">{(metrics?.memory.percent || 0).toFixed(0)}%</span>
                  </CircularProgress>
                  <p className="mt-2 text-[10px] lg:text-xs text-gray-500 text-center">
                    {formatBytes(metrics?.memory.used || 0)}
                  </p>
                </div>

                {/* Disk Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl flex flex-col items-center">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <HardDrive className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] lg:text-xs font-semibold uppercase tracking-wider">Disk</span>
                  </div>
                  <CircularProgress value={metrics?.disk.percent || 0} size={100} strokeWidth={10} color="accent">
                    <span className="text-xl lg:text-2xl font-bold text-white">{(metrics?.disk.percent || 0).toFixed(0)}%</span>
                  </CircularProgress>
                  <p className="mt-2 text-[10px] lg:text-xs text-gray-500 text-center">
                    {formatBytes(metrics?.disk.used || 0)}
                  </p>
                </div>

                {/* Network Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl flex flex-col items-center">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <Wifi className="h-4 w-4 text-cyan-400" />
                    <span className="text-[10px] lg:text-xs font-semibold uppercase tracking-wider">Network</span>
                  </div>
                  <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full border-[10px] border-white/10">
                    <div className="flex flex-col items-center gap-1">
                      <Activity className="h-5 w-5 text-cyan-400 mb-1" />
                      <span className="text-[10px] lg:text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="h-2.5 w-2.5" />
                        {formatBytes(metrics?.network.up || 0)}/s
                      </span>
                      <span className="text-[10px] lg:text-xs font-semibold text-blue-400 flex items-center gap-1">
                        <TrendingUp className="h-2.5 w-2.5 rotate-180" />
                        {formatBytes(metrics?.network.down || 0)}/s
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] lg:text-xs text-gray-500">
                    Up / Down
                  </p>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">System Information</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-[10px] font-medium uppercase">Uptime</span>
                    </div>
                    <p className="text-sm lg:text-lg font-semibold text-white">
                      {formatUptime(metrics?.uptime || 0)}
                    </p>
                  </div>

                  {metrics?.loadAverage && metrics.loadAverage.length >= 3 && (
                    <>
                      <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Activity className="h-3 w-3" />
                          <span className="text-[10px] font-medium uppercase">Load 1m</span>
                        </div>
                        <p className="text-sm lg:text-lg font-semibold text-white">
                          {metrics.loadAverage[0].toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Activity className="h-3 w-3" />
                          <span className="text-[10px] font-medium uppercase">Load 5m</span>
                        </div>
                        <p className="text-sm lg:text-lg font-semibold text-white">
                          {metrics.loadAverage[1].toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Activity className="h-3 w-3" />
                          <span className="text-[10px] font-medium uppercase">Load 15m</span>
                        </div>
                        <p className="text-sm lg:text-lg font-semibold text-white">
                          {metrics.loadAverage[2].toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <MemoryStick className="h-3 w-3" />
                      <span className="text-[10px] font-medium uppercase">Total RAM</span>
                    </div>
                    <p className="text-sm lg:text-lg font-semibold text-white">
                      {formatBytes(metrics?.memory.total || 0)}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <HardDrive className="h-3 w-3" />
                      <span className="text-[10px] font-medium uppercase">Total Disk</span>
                    </div>
                    <p className="text-sm lg:text-lg font-semibold text-white">
                      {formatBytes(metrics?.disk.total || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Historical Data Section */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Historical Data</h3>
                    <span className="ml-auto text-xs text-gray-500">Last 6 hours</span>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* CPU History */}
                    <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Cpu className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-white">CPU Usage</span>
                      </div>
                      <HistoryChart type="cpu" data={filteredHistory} height={100} />
                    </div>

                    {/* Memory History */}
                    <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MemoryStick className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-medium text-white">Memory Usage</span>
                      </div>
                      <HistoryChart type="memory" data={filteredHistory} height={100} />
                    </div>

                    {/* Disk History */}
                    <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <HardDrive className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-medium text-white">Disk Usage</span>
                      </div>
                      <HistoryChart type="disk" data={filteredHistory} height={100} />
                    </div>

                    {/* Network History */}
                    <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-medium text-white">Network Download</span>
                      </div>
                      <HistoryChart type="network" data={filteredHistory} height={100} />
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                      Data collected every 5 minutes. Showing last 6 hours of history.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
