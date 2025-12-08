"use client";

import { useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Progress } from "@/components/ui/progress";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";
import { useData } from "@/contexts/data-context";
import {
  Server,
  Search,
  ExternalLink,
  Clock,
  Zap,
  Activity,
  Globe,
  RefreshCw,
  Database,
} from "lucide-react";

// Map service names to icons
function getServiceIcon(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("research")) return Globe;
  if (lowerName.includes("backend") || lowerName.includes("appwrite")) return Database;
  if (lowerName.includes("status") || lowerName.includes("uptime")) return Activity;
  if (lowerName.includes("dashboard")) return Server;
  return Globe;
}

export function ServicesContent() {
  const { services, isRefreshing, refreshServices } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredServices = useMemo(() => {
    let filtered = services;

    if (searchQuery) {
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((service) => service.status === statusFilter);
    }

    return filtered;
  }, [services, searchQuery, statusFilter]);

  const getStatusCounts = () => {
    return {
      all: services.length,
      online: services.filter((s) => s.status === "online").length,
      offline: services.filter((s) => s.status === "offline").length,
      degraded: services.filter((s) => s.status === "degraded").length,
    };
  };

  const statusCounts = getStatusCounts();
  const avgResponseTime = services
    .filter((s) => s.responseTime !== undefined)
    .reduce((acc, s) => acc + (s.responseTime || 0), 0) / services.filter((s) => s.responseTime).length;

  const avgUptime = services
    .filter((s) => s.uptime !== undefined)
    .reduce((acc, s) => acc + (s.uptime || 0), 0) / services.filter((s) => s.uptime).length;

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
              Services
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              Monitor all your services
            </p>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">
                {isRefreshing ? 'Syncing' : 'Online'}
              </span>
            </div>
            <button
              onClick={refreshServices}
              disabled={isRefreshing}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <NotificationDropdown />
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-24 lg:pb-6 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 lg:p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-400">Total</span>
                </div>
                <p className="text-xl lg:text-2xl font-bold text-white">{statusCounts.all}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 lg:p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-gray-400">Online</span>
                </div>
                <p className="text-xl lg:text-2xl font-bold text-emerald-400">{statusCounts.online}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 lg:p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Response</span>
                </div>
                <p className="text-xl lg:text-2xl font-bold text-blue-400">
                  {isNaN(avgResponseTime) ? "--" : `${Math.round(avgResponseTime)}ms`}
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 lg:p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-gray-400">Uptime</span>
                </div>
                <p className="text-xl lg:text-2xl font-bold text-emerald-400">
                  {isNaN(avgUptime) ? "--" : `${avgUptime.toFixed(1)}%`}
                </p>
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
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 text-gray-300 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>

                {/* Status Filter - Scrollable on mobile */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
                  {[
                    { value: "all", label: "All", count: statusCounts.all },
                    { value: "online", label: "Online", count: statusCounts.online },
                    { value: "offline", label: "Offline", count: statusCounts.offline },
                    { value: "degraded", label: "Degraded", count: statusCounts.degraded },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`flex-shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        statusFilter === filter.value
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                          : "bg-black/20 text-gray-400 hover:text-white border border-white/10"
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Services Grid */}
            {filteredServices.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 lg:p-12 rounded-2xl text-center">
                <Server className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No services found
                </h3>
                <p className="text-sm text-gray-500">
                  {searchQuery
                    ? "Try adjusting your search query or filters"
                    : "No services are currently configured"}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 lg:gap-4 md:grid-cols-2">
                {filteredServices.map((service) => {
                  const IconComponent = getServiceIcon(service.name);
                  return (
                    <a
                      key={service.id}
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-purple-500/10">
                        {/* Header */}
                        <div className="p-3 lg:p-4 border-b border-white/5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-3 w-3 rounded-full flex-shrink-0 ${
                                service.status === "online"
                                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                  : service.status === "offline"
                                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                  : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                              }`} />
                              <div className="min-w-0">
                                <h3 className="text-sm lg:text-base font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                                  {service.name}
                                </h3>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Globe className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{service.subdomain}.firefetch.org</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            </div>
                            <span className={`flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${
                              service.status === "online"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : service.status === "offline"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}>
                              {service.status}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-3 lg:p-4 space-y-3">
                          {/* Description */}
                          {service.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {service.description}
                            </p>
                          )}

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 lg:p-3 rounded-xl bg-black/20">
                              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                <Zap className="h-3 w-3" />
                                <span className="text-[10px] font-medium uppercase">Response</span>
                              </div>
                              <p className="text-sm lg:text-base font-semibold text-white font-mono">
                                {service.responseTime !== undefined ? `${service.responseTime}ms` : "--"}
                              </p>
                            </div>
                            <div className="p-2 lg:p-3 rounded-xl bg-black/20">
                              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                <Server className="h-3 w-3" />
                                <span className="text-[10px] font-medium uppercase">Port</span>
                              </div>
                              <p className="text-sm lg:text-base font-semibold text-white font-mono">
                                {service.internalPort}
                              </p>
                            </div>
                          </div>

                          {/* Uptime Progress */}
                          {service.uptime !== undefined && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>Uptime</span>
                                </div>
                                <span className="text-xs font-semibold text-white font-mono">
                                  {service.uptime.toFixed(2)}%
                                </span>
                              </div>
                              <Progress value={service.uptime} size="sm" color="success" />
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
