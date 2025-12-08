"use client";

import { useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Progress } from "@/components/ui/progress";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";
import { formatBytes, formatUptime, cn } from "@/lib/utils";
import { useData, type DockerContainerData } from "@/contexts/data-context";
import {
  Container,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Square,
  Play,
  Trash2,
  ArrowUpDown,
  Filter,
  Box,
} from "lucide-react";

type StatusFilter = "all" | "running" | "stopped";

export function DockerContent() {
  const { containers, isRefreshing } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());

  const filteredContainers = useMemo(() => {
    let filtered = containers;

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.image.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [containers, statusFilter, searchQuery]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedContainers);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedContainers(newExpanded);
  };

  const runningCount = containers.filter((c) => c.status === "running").length;
  const stoppedCount = containers.filter((c) => c.status === "stopped").length;

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
              Docker Containers
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              Manage your containers
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
          <div className="max-w-7xl mx-auto animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 lg:p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Container className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-400">Total</span>
                </div>
                <p className="text-xl lg:text-2xl font-bold text-white">{containers.length}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 lg:p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-gray-400">Running</span>
                </div>
                <p className="text-xl lg:text-2xl font-bold text-emerald-400">{runningCount}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 lg:p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Square className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-gray-400">Stopped</span>
                </div>
                <p className="text-xl lg:text-2xl font-bold text-red-400">{stoppedCount}</p>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 lg:p-4 rounded-2xl mb-4 lg:mb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search containers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 text-gray-300 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <div className="flex rounded-xl overflow-hidden border border-white/10 bg-black/20">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={cn(
                        "px-3 py-2 text-xs font-medium transition-all",
                        statusFilter === "all"
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter("running")}
                      className={cn(
                        "border-l border-white/10 px-3 py-2 text-xs font-medium transition-all",
                        statusFilter === "running"
                          ? "bg-emerald-500 text-white"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      Running
                    </button>
                    <button
                      onClick={() => setStatusFilter("stopped")}
                      className={cn(
                        "border-l border-white/10 px-3 py-2 text-xs font-medium transition-all",
                        statusFilter === "stopped"
                          ? "bg-red-500 text-white"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      Stopped
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Container List */}
            <div className="space-y-3">
              {filteredContainers.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 lg:p-12 rounded-2xl text-center">
                  <Box className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No containers found
                  </h3>
                  <p className="text-sm text-gray-500">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your search or filters"
                      : "No containers are currently running"}
                  </p>
                </div>
              ) : (
                filteredContainers.map((container) => (
                  <ContainerRow
                    key={container.id}
                    container={container}
                    isExpanded={expandedContainers.has(container.id)}
                    onToggleExpand={() => toggleExpanded(container.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface ContainerRowProps {
  container: DockerContainerData;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function ContainerRow({ container, isExpanded, onToggleExpand }: ContainerRowProps) {
  const memoryPercent = (container.memory.used / container.memory.limit) * 100;

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
      {/* Main Row */}
      <div className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4">
        {/* Status Dot */}
        <div className={`h-3 w-3 rounded-full flex-shrink-0 ${
          container.status === "running"
            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
        }`} />

        {/* Container Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="truncate font-medium text-sm lg:text-base text-white">{container.name}</span>
            <span className={cn(
              "rounded-lg px-2 py-0.5 text-[10px] font-medium flex-shrink-0",
              container.status === "running" && "bg-emerald-500/20 text-emerald-400",
              container.status === "stopped" && "bg-red-500/20 text-red-400",
              container.status === "restarting" && "bg-amber-500/20 text-amber-400",
              container.status === "paused" && "bg-amber-500/20 text-amber-400"
            )}>
              {container.status}
            </span>
            {container.uptime && container.status === "running" && (
              <span className="text-[10px] text-gray-500">
                Up {formatUptime(container.uptime)}
              </span>
            )}
          </div>

          <p className="mt-0.5 truncate text-xs text-gray-500 font-mono">{container.image}</p>

          {/* Resource Usage */}
          <div className="mt-2 lg:mt-3 flex flex-wrap items-center gap-3 lg:gap-6">
            {/* CPU */}
            <div className="flex items-center gap-2 min-w-[100px] lg:min-w-[120px]">
              <span className="w-8 text-[10px] text-gray-500">CPU</span>
              <Progress value={container.cpu} size="sm" className="flex-1" />
              <span className="w-10 text-right text-[10px] text-gray-400 font-mono">
                {container.cpu.toFixed(1)}%
              </span>
            </div>

            {/* Memory */}
            <div className="flex items-center gap-2 min-w-[120px] lg:min-w-[160px]">
              <span className="w-8 text-[10px] text-gray-500">MEM</span>
              <Progress value={memoryPercent} size="sm" className="flex-1" />
              <span className="w-14 text-right text-[10px] text-gray-400 font-mono">
                {formatBytes(container.memory.used)}
              </span>
            </div>

            {/* Network - Hidden on mobile */}
            {container.network && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                <ArrowUpDown className="h-3 w-3" />
                <span className="text-emerald-400 font-mono">{formatBytes(container.network.tx)}/s</span>
                <span className="text-blue-400 font-mono">{formatBytes(container.network.rx)}/s</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {container.status === "running" && (
            <>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/10 hover:text-white"
                title="Restart container"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/10 hover:text-amber-400"
                title="Stop container"
              >
                <Square className="h-4 w-4" />
              </button>
            </>
          )}
          {container.status === "stopped" && (
            <>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/10 hover:text-emerald-400"
                title="Start container"
              >
                <Play className="h-4 w-4" />
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/10 hover:text-red-400"
                title="Remove container"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Expand Toggle */}
          <button
            onClick={onToggleExpand}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/10 hover:text-white"
            title={isExpanded ? "Collapse details" : "Expand details"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-white/5 bg-black/20 p-3 lg:p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Container Details */}
            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Container Details
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">ID:</dt>
                  <dd className="font-mono text-gray-300">{container.id.slice(0, 12)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name:</dt>
                  <dd className="text-gray-300">{container.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Image:</dt>
                  <dd className="truncate text-gray-300 max-w-[180px] font-mono text-xs">{container.image}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status:</dt>
                  <dd className="text-gray-300 capitalize">{container.status}</dd>
                </div>
              </dl>
            </div>

            {/* Resource Usage Details */}
            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Resource Usage
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">CPU:</dt>
                  <dd className="text-gray-300 font-mono">{container.cpu.toFixed(2)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Memory Used:</dt>
                  <dd className="text-gray-300 font-mono">{formatBytes(container.memory.used)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Memory Limit:</dt>
                  <dd className="text-gray-300 font-mono">{formatBytes(container.memory.limit)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Memory %:</dt>
                  <dd className="text-gray-300 font-mono">{memoryPercent.toFixed(1)}%</dd>
                </div>
                {container.network && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Network RX:</dt>
                      <dd className="text-gray-300 font-mono">{formatBytes(container.network.rx)}/s</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Network TX:</dt>
                      <dd className="text-gray-300 font-mono">{formatBytes(container.network.tx)}/s</dd>
                    </div>
                  </>
                )}
                {container.uptime && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Uptime:</dt>
                    <dd className="text-gray-300">{formatUptime(container.uptime)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
