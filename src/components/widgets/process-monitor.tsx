"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Search, ArrowUpDown, RefreshCw } from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";

interface ProcessInfo {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  memory: number;
  memoryBytes: number;
  diskRead: number;
  diskWrite: number;
  command: string;
}

interface ProcessMetrics {
  processes: ProcessInfo[];
  timestamp: string;
  totalProcesses: number;
  limit: number;
  sort: string;
}

type SortField = "cpu" | "memory" | "name" | "pid" | "user";
type SortDirection = "asc" | "desc";

export function ProcessMonitor() {
  const [data, setData] = useState<ProcessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("cpu");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch process data
  const fetchProcesses = async () => {
    try {
      const response = await fetch(`/api/processes?sort=${sortField}&limit=50`);
      if (!response.ok) throw new Error("Failed to fetch processes");
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchProcesses();

    if (autoRefresh) {
      const interval = setInterval(fetchProcesses, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [sortField, autoRefresh]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to descending for numeric, ascending for text
      setSortField(field);
      setSortDirection(field === "name" || field === "user" ? "asc" : "desc");
    }
  };

  // Filter and sort processes
  const filteredAndSortedProcesses = useMemo(() => {
    if (!data?.processes) return [];

    // Filter by search query
    let filtered = data.processes.filter(
      (proc) =>
        proc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proc.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proc.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proc.pid.toString().includes(searchQuery)
    );

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "cpu":
          aVal = a.cpu;
          bVal = b.cpu;
          break;
        case "memory":
          aVal = a.memory;
          bVal = b.memory;
          break;
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "pid":
          aVal = a.pid;
          bVal = b.pid;
          break;
        case "user":
          aVal = a.user.toLowerCase();
          bVal = b.user.toLowerCase();
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [data, searchQuery, sortField, sortDirection]);

  // Render sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <ArrowUpDown className={cn("ml-1 h-3 w-3 inline", sortDirection === "desc" && "rotate-180")} />
    );
  };

  if (loading && !data) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Process Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
            <span className="ml-3 text-text-muted">Loading processes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Process Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-error text-sm">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Process Monitor</CardTitle>
            <span className="text-xs text-text-muted">
              ({data?.totalProcesses || 0} total processes)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                autoRefresh
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-surface border border-border text-text-muted hover:text-text-primary"
              )}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>
            <button
              onClick={fetchProcesses}
              className="p-2 rounded-md bg-surface border border-border text-text-muted hover:text-text-primary hover:border-border/80 transition-colors"
              title="Refresh now"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search bar */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, command, user, or PID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* Process table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th
                  onClick={() => handleSort("pid")}
                  className="text-left py-3 px-3 font-semibold text-text-secondary uppercase tracking-wider text-xs cursor-pointer hover:text-text-primary transition-colors"
                >
                  PID <SortIndicator field="pid" />
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="text-left py-3 px-3 font-semibold text-text-secondary uppercase tracking-wider text-xs cursor-pointer hover:text-text-primary transition-colors"
                >
                  Process <SortIndicator field="name" />
                </th>
                <th
                  onClick={() => handleSort("user")}
                  className="text-left py-3 px-3 font-semibold text-text-secondary uppercase tracking-wider text-xs cursor-pointer hover:text-text-primary transition-colors"
                >
                  User <SortIndicator field="user" />
                </th>
                <th
                  onClick={() => handleSort("cpu")}
                  className="text-right py-3 px-3 font-semibold text-text-secondary uppercase tracking-wider text-xs cursor-pointer hover:text-text-primary transition-colors"
                >
                  CPU % <SortIndicator field="cpu" />
                </th>
                <th
                  onClick={() => handleSort("memory")}
                  className="text-right py-3 px-3 font-semibold text-text-secondary uppercase tracking-wider text-xs cursor-pointer hover:text-text-primary transition-colors"
                >
                  Memory <SortIndicator field="memory" />
                </th>
                <th className="text-right py-3 px-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">
                  Disk I/O
                </th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">
                  Command
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProcesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-text-muted">
                    No processes found
                  </td>
                </tr>
              ) : (
                filteredAndSortedProcesses.map((proc) => (
                  <tr
                    key={proc.pid}
                    className="border-b border-border/50 hover:bg-surface/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-text-muted font-mono text-xs">
                      {proc.pid}
                    </td>
                    <td className="py-3 px-3 text-text-primary font-medium">
                      {proc.name}
                    </td>
                    <td className="py-3 px-3 text-text-secondary text-xs">
                      {proc.user}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-semibold",
                          proc.cpu > 50
                            ? "bg-error/20 text-error"
                            : proc.cpu > 25
                            ? "bg-warning/20 text-warning"
                            : "bg-success/20 text-success"
                        )}
                      >
                        {proc.cpu.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      <div className="text-text-primary">{formatBytes(proc.memoryBytes)}</div>
                      <div className="text-text-muted text-[10px]">{proc.memory.toFixed(1)}%</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      {proc.diskRead > 0 || proc.diskWrite > 0 ? (
                        <div>
                          <div className="text-primary text-[10px]">
                            ↓ {formatBytes(proc.diskRead)}
                          </div>
                          <div className="text-success text-[10px]">
                            ↑ {formatBytes(proc.diskWrite)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-text-muted text-xs max-w-md truncate" title={proc.command}>
                      {proc.command}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
          <div>
            Showing {filteredAndSortedProcesses.length} of {data?.processes.length || 0} processes
            {searchQuery && " (filtered)"}
          </div>
          <div>
            Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "-"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
