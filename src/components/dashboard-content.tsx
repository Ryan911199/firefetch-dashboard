"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { formatBytes } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";
import { ProgressBar } from "@/components/ui/progress-bar";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";
import { useData } from "@/contexts/data-context";
import {
  Cpu,
  HardDrive,
  Activity,
  Zap,
  Box,
  Globe,
  Database,
  Terminal,
  Network,
  FlaskConical,
  BarChart3,
  Shield,
} from "lucide-react";

function getServiceConfig(name: string): { icon: React.ElementType; color: string; bgColor: string } {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("research")) {
    return { icon: FlaskConical, color: "text-emerald-400", bgColor: "from-emerald-500/20 to-teal-500/20" };
  }
  if (lowerName.includes("backend") || lowerName.includes("appwrite")) {
    return { icon: Database, color: "text-orange-400", bgColor: "from-orange-500/20 to-amber-500/20" };
  }
  if (lowerName.includes("status") || lowerName.includes("uptime")) {
    return { icon: Activity, color: "text-cyan-400", bgColor: "from-cyan-500/20 to-blue-500/20" };
  }
  if (lowerName.includes("dashboard")) {
    return { icon: BarChart3, color: "text-purple-400", bgColor: "from-purple-500/20 to-pink-500/20" };
  }
  if (lowerName.includes("traefik") || lowerName.includes("proxy")) {
    return { icon: Shield, color: "text-blue-400", bgColor: "from-blue-500/20 to-indigo-500/20" };
  }

  return { icon: Globe, color: "text-gray-400", bgColor: "from-gray-500/20 to-slate-500/20" };
}

function formatUptime(seconds: number): string {
  if (!seconds) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function DashboardContent() {
  const { metrics, services, containers, isRefreshing, lastUpdate, netHistory, uploadHistory } = useData();

  const onlineServices = services.filter((s) => s.status === "online").length;
  const runningContainers = containers.filter((c) => c.status === "running").length;

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
              System Overview
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              {metrics ? "All systems operational" : "Loading..."}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 animate-fade-in pb-10">
              {/* Top Row: Key Metrics */}
              <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {/* CPU Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-75" />

                  <div className="flex justify-between items-start mb-4 lg:mb-6 relative">
                    <div>
                      <p className="text-gray-400 text-xs lg:text-sm font-medium flex items-center gap-2">
                        <Cpu size={14} /> CPU Load
                      </p>
                      <h3 className="text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mt-1 lg:mt-2">
                        {metrics?.cpu.toFixed(1) || 0}%
                      </h3>
                    </div>
                    <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/5 rounded-xl shadow-inner">
                      <Zap className="text-blue-400" size={20} />
                    </div>
                  </div>
                  <ProgressBar
                    value={metrics?.cpu || 0}
                    colorStart="blue"
                    colorEnd="indigo"
                    subLabel={metrics?.loadAverage ? `Load: ${metrics.loadAverage[0].toFixed(2)}` : undefined}
                  />
                </div>

                {/* Memory Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-75" />

                  <div className="flex justify-between items-start mb-4 lg:mb-6 relative">
                    <div>
                      <p className="text-gray-400 text-xs lg:text-sm font-medium flex items-center gap-2">
                        <Activity size={14} /> Memory
                      </p>
                      <h3 className="text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mt-1 lg:mt-2">
                        {metrics?.memory.percent.toFixed(1) || 0}%
                      </h3>
                    </div>
                    <div className="p-2 lg:p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/5 rounded-xl shadow-inner">
                      <Box className="text-purple-400" size={20} />
                    </div>
                  </div>
                  <ProgressBar
                    value={metrics?.memory.percent || 0}
                    colorStart="purple"
                    colorEnd="fuchsia"
                    subLabel={metrics ? `${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}` : undefined}
                  />
                </div>

                {/* Disk Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4 lg:mb-6">
                    <div>
                      <p className="text-gray-400 text-xs lg:text-sm font-medium flex items-center gap-2">
                        <HardDrive size={14} /> Disk Usage
                      </p>
                      <h3 className="text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mt-1 lg:mt-2">
                        {metrics?.disk.percent.toFixed(1) || 0}%
                      </h3>
                    </div>
                    <div className={`p-2 lg:p-3 rounded-xl border border-white/5 shadow-inner transition-colors duration-500 ${
                      metrics && metrics.disk.percent > 90 ? 'bg-red-500/20' : 'bg-emerald-500/20'
                    }`}>
                      <HardDrive className={metrics && metrics.disk.percent > 90 ? 'text-red-400' : 'text-emerald-400'} size={20} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs lg:text-sm text-gray-400 bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="whitespace-nowrap">Used</span>
                    <span className="text-white font-mono whitespace-nowrap">
                      {metrics ? formatBytes(metrics.disk.used) : '0 B'}
                    </span>
                  </div>
                  <div className="mt-3 lg:mt-4 text-xs text-gray-500 flex items-start gap-1.5">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      metrics && metrics.disk.percent > 90 ? 'bg-red-500' : 'bg-emerald-500'
                    }`} />
                    <span className="leading-tight">
                      Storage is {metrics && metrics.disk.percent > 90 ? 'running low' : 'nominal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Network Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue-900/10 pointer-events-none" />
                <div className="flex justify-between items-center mb-4 lg:mb-6">
                  <h3 className="text-base lg:text-lg font-semibold text-white flex items-center gap-2">
                    <Network className="text-blue-400" size={20} />
                    Network Traffic
                  </h3>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30">Live</span>
                </div>

                <div className="space-y-6 lg:space-y-8 relative z-10">
                  <div>
                    <div className="flex justify-between text-xs lg:text-sm mb-2">
                      <span className="text-gray-400 flex items-center">
                        <Activity size={14} className="mr-1 rotate-180 text-emerald-400" /> Download
                      </span>
                      <span className="text-white font-mono text-base lg:text-lg">
                        {formatBytes(metrics?.network.down || 0)}
                        <span className="text-xs text-gray-500">/s</span>
                      </span>
                    </div>
                    <Sparkline data={netHistory} color="#34d399" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs lg:text-sm mb-2">
                      <span className="text-gray-400 flex items-center">
                        <Activity size={14} className="mr-1 text-blue-400" /> Upload
                      </span>
                      <span className="text-white font-mono text-base lg:text-lg">
                        {formatBytes(metrics?.network.up || 0)}
                        <span className="text-xs text-gray-500">/s</span>
                      </span>
                    </div>
                    <Sparkline data={uploadHistory} color="#60a5fa" />
                  </div>
                </div>

                <div className="mt-4 lg:mt-6 pt-4 border-t border-white/10 flex justify-between text-xs text-gray-500 font-mono">
                  <span>eth0</span>
                  <span>Uptime: {formatUptime(metrics?.uptime || 0)}</span>
                </div>
              </div>

              {/* Services Grid */}
              <div className="col-span-1 lg:col-span-3">
                <div className="flex justify-between items-center mb-3 lg:mb-4 px-1">
                  <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
                    <Globe size={20} className="text-purple-400" /> Hosted Services
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {onlineServices}/{services.length} online
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
                  {services.map((service) => {
                    const config = getServiceConfig(service.name);
                    const IconComponent = config.icon;
                    return (
                      <a
                        key={service.id}
                        href={service.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white/5 backdrop-blur-md hover:bg-white/10 border border-white/10 hover:border-purple-500/50 p-3 lg:p-4 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className={`absolute top-2 lg:top-3 right-2 lg:right-3 w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${
                          service.status === 'online' ? 'bg-emerald-400 shadow-emerald-400/50' :
                          service.status === 'degraded' ? 'bg-amber-400 shadow-amber-400/50' :
                          'bg-red-400 shadow-red-400/50'
                        }`} />

                        <div className={`p-2 lg:p-3 bg-gradient-to-br ${config.bgColor} rounded-xl mb-2 lg:mb-3 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                          <IconComponent size={20} className={config.color} />
                        </div>
                        <h3 className="font-medium text-gray-200 text-xs lg:text-sm group-hover:text-white transition-colors line-clamp-1">
                          {service.name}
                        </h3>
                        {service.responseTime && (
                          <span className="text-[10px] text-gray-500 mt-1">
                            {service.responseTime}ms
                          </span>
                        )}
                      </a>
                    );
                  })}
                  {services.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500 text-sm">
                      No services configured
                    </div>
                  )}
                </div>
              </div>

              {/* Docker Containers & System Info */}
              <div className="col-span-1 lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl shadow-xl">
                <div className="flex justify-between items-center mb-4 lg:mb-6">
                  <h3 className="text-base lg:text-lg font-semibold text-white flex items-center gap-2">
                    <Database size={20} className="text-purple-400" /> Docker Containers
                  </h3>
                  <span className="text-xs text-gray-400">
                    {runningContainers}/{containers.length} running
                  </span>
                </div>
                <div className="space-y-3 lg:space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                  {containers.map((container) => (
                    <div key={container.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          container.status === 'running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-500'
                        }`} />
                        <span className="text-sm text-white font-medium truncate">{container.name}</span>
                      </div>
                      <div className="flex items-center gap-3 lg:gap-4 shrink-0">
                        <div className="hidden sm:block w-20 lg:w-24">
                          <div className="text-[10px] text-gray-400 mb-1 flex justify-between">
                            <span>CPU</span>
                            <span>{container.cpu.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-900/50 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, container.cpu)}%` }}
                            />
                          </div>
                        </div>
                        <div className="hidden sm:block w-20 lg:w-24">
                          <div className="text-[10px] text-gray-400 mb-1 flex justify-between">
                            <span>MEM</span>
                            <span>{formatBytes(container.memory.used)}</span>
                          </div>
                          <div className="w-full bg-slate-900/50 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, (container.memory.used / container.memory.limit) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className={`text-xs capitalize px-2 py-1 rounded ${
                          container.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {container.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {containers.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No containers running
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity / System Events */}
              <div className="col-span-1 bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl shadow-xl flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base lg:text-lg font-semibold text-white flex items-center gap-2">
                    <Terminal size={18} className="text-gray-400" /> System Info
                  </h3>
                </div>
                <div className="flex-1 space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-white font-mono">{formatUptime(metrics?.uptime || 0)}</span>
                  </div>
                  {metrics?.loadAverage && (
                    <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                      <span className="text-gray-400">Load Average</span>
                      <span className="text-white font-mono">
                        {metrics.loadAverage.map(l => l.toFixed(2)).join(' / ')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                    <span className="text-gray-400">Services</span>
                    <span className="text-white font-mono">{onlineServices}/{services.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                    <span className="text-gray-400">Containers</span>
                    <span className="text-white font-mono">{runningContainers}/{containers.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                    <span className="text-gray-400">Last Update</span>
                    <span className="text-white font-mono text-xs">
                      {lastUpdate.toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      metrics && metrics.cpu < 80 && metrics.memory.percent < 85 && metrics.disk.percent < 90
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                    }`} />
                    <span className="text-xs text-gray-400">
                      System is {metrics && metrics.cpu < 80 && metrics.memory.percent < 85 ? 'healthy' : 'under load'}
                    </span>
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
