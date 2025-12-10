'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, Activity, RefreshCw } from 'lucide-react';
import { TimeframeSelector } from '@/components/ui/timeframe-selector';
import { UptimeBar } from '@/components/ui/uptime-bar';
import { UptimeDisplay } from '@/components/uptime-display';

interface ServiceUptime {
  service_id: string;
  service_name: string;
  current_status: string;
  uptime_24h: number;
  uptime_7d: number;
  uptime_30d: number;
  uptime_90d: number;
  avg_response_time: number | null;
  total_checks: number;
  last_checked: number;
}

interface Incident {
  id: number;
  timestamp: number;
  resolved_at: number | null;
  service_id: string;
  service_name: string;
  title: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
}

interface StatusData {
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  services: ServiceUptime[];
  activeIncidents: Incident[];
  recentIncidents: Incident[];
  summary: {
    total: number;
    online: number;
    degraded: number;
    offline: number;
    avgUptime24h: number;
  };
  lastUpdated: number;
}

const statusConfig = {
  operational: {
    label: 'All Systems Operational',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: CheckCircle,
  },
  degraded: {
    label: 'Degraded Performance',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: AlertTriangle,
  },
  partial_outage: {
    label: 'Partial System Outage',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: AlertTriangle,
  },
  major_outage: {
    label: 'Major System Outage',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: XCircle,
  },
};

const serviceStatusConfig = {
  online: { color: 'bg-green-500', label: 'Operational' },
  degraded: { color: 'bg-yellow-500', label: 'Degraded' },
  offline: { color: 'bg-red-500', label: 'Offline' },
};

function formatUptime(percent: number): string {
  return percent.toFixed(2) + '%';
}

function formatResponseTime(ms: number | null): string {
  if (ms === null) return '-';
  return ms.toFixed(0) + 'ms';
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}


export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceHistory, setServiceHistory] = useState<Record<string, { status: string }[]>>({});
  const [selectedTimeframe, setSelectedTimeframe] = useState<"24h" | "7d" | "30d" | "90d">("24h");

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const statusData = await response.json();
      setData(statusData);
      setError(null);

      // Fetch history for each service
      const historyPromises = statusData.services.map(async (service: ServiceUptime) => {
        const histRes = await fetch(`/api/status?service=${service.service_id}&hours=24`);
        const histData = await histRes.json();
        return { serviceId: service.service_id, history: histData.history || [] };
      });

      const histories = await Promise.all(historyPromises);
      const historyMap: Record<string, { status: string }[]> = {};
      histories.forEach((h) => {
        historyMap[h.serviceId] = h.history;
      });
      setServiceHistory(historyMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-secondary">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading status...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-text-primary mb-2">Unable to load status</h1>
          <p className="text-text-secondary mb-4">{error}</p>
          <button
            onClick={fetchStatus}
            className="px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface-hover transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[data.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-400" />
              <h1 className="text-xl font-bold text-text-primary">FireFetch Status</h1>
            </div>
            <div className="text-sm text-text-secondary">
              Updated {formatRelativeTime(data.lastUpdated)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Overall Status Banner */}
        <div className={`rounded-xl p-6 ${statusInfo.bg} border ${statusInfo.border} mb-8`}>
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
            <div className="flex-1">
              <h2 className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.label}</h2>
              <p className="text-text-secondary mt-1">
                {data.summary.online} of {data.summary.total} services operational
              </p>
              {data.summary.avgUptime24h < 100 && (
                <p className="text-text-muted text-sm mt-2">
                  Average uptime: {formatUptime(data.summary.avgUptime24h)} (last 24h)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Active Incidents */}
        {data.activeIncidents.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Active Incidents</h3>
            <div className="space-y-3">
              {data.activeIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`p-4 rounded-lg border ${
                    incident.severity === 'critical'
                      ? 'bg-red-500/10 border-red-500/30'
                      : incident.severity === 'major'
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-text-primary">{incident.title}</h4>
                      <p className="text-sm text-text-secondary mt-1">{incident.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                        <span>Service: {incident.service_name}</span>
                        <span>Status: {incident.status}</span>
                        <span>Started: {formatRelativeTime(incident.timestamp)}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        incident.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : incident.severity === 'major'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {incident.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Services</h3>
            <TimeframeSelector
              selected={selectedTimeframe}
              onChange={setSelectedTimeframe}
            />
          </div>
          <div className="space-y-4">
            {data.services.map((service) => {
              const statusConf = serviceStatusConfig[service.current_status as keyof typeof serviceStatusConfig] || serviceStatusConfig.offline;
              const history = serviceHistory[service.service_id] || [];

              return (
                <div
                  key={service.service_id}
                  className="bg-surface border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${statusConf.color}`} />
                      <span className="font-medium text-text-primary">{service.service_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span className="hidden sm:inline">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {formatResponseTime(service.avg_response_time)}
                      </span>
                      <span>{statusConf.label}</span>
                    </div>
                  </div>

                  {/* Uptime bar */}
                  <UptimeBar history={history} maxBars={90} height="md" showDayLabels={false} />

                  {/* Uptime stats */}
                  <div className="flex items-center justify-between mt-3 text-xs text-text-secondary">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span>24h: {formatUptime(service.uptime_24h)}</span>
                      <span>7d: {formatUptime(service.uptime_7d)}</span>
                      <span className="hidden sm:inline">30d: {formatUptime(service.uptime_30d)}</span>
                      <span className="hidden md:inline">90d: {formatUptime(service.uptime_90d)}</span>
                    </div>
                    <UptimeDisplay
                      uptime24h={service.uptime_24h}
                      uptime7d={service.uptime_7d}
                      uptime30d={service.uptime_30d}
                      uptime90d={service.uptime_90d}
                      selectedTimeframe={selectedTimeframe}
                    />
                  </div>
                  <div className="text-xs text-text-muted mt-2">
                    Last check: {formatRelativeTime(service.last_checked)}
                  </div>
                </div>
              );
            })}

            {data.services.length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                No services configured yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Incidents */}
        {data.recentIncidents.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Past Incidents</h3>
            <div className="space-y-3">
              {data.recentIncidents
                .filter((i) => i.status === 'resolved')
                .map((incident) => (
                  <div
                    key={incident.id}
                    className="bg-surface border border-border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-text-primary">{incident.title}</h4>
                        <p className="text-sm text-text-secondary mt-1">{incident.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                          <span>Service: {incident.service_name}</span>
                          <span>
                            Duration:{' '}
                            {incident.resolved_at
                              ? Math.round((incident.resolved_at - incident.timestamp) / 60000) + ' min'
                              : 'ongoing'}
                          </span>
                          <span>{formatRelativeTime(incident.timestamp)}</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                        resolved
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>Powered by FireFetch Dashboard</span>
            <a
              href="/"
              className="text-blue-400 hover:text-blue-300 transition"
            >
              View Dashboard
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
