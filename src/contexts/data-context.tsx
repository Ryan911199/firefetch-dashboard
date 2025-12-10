"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import {
  getSocket,
  subscribeToMetrics,
  subscribeToContainers,
  subscribeToServices,
  subscribeToHistory,
  transformMetrics,
  transformContainers,
  isConnected,
  MetricsUpdate,
  ContainerUpdate,
  ServiceUpdate,
} from "@/lib/socket-client";

// Types
export interface SystemMetrics {
  cpu: number;
  memory: { used: number; total: number; percent: number };
  disk: { used: number; total: number; percent: number };
  network: { up: number; down: number };
  uptime: number;
  loadAverage?: number[];
}

export interface ServiceData {
  id: string;
  name: string;
  subdomain?: string;
  description?: string;
  internalPort?: number;
  status: string;
  responseTime?: number;
  uptime?: number;
  url?: string;
}

export interface DockerContainerData {
  id: string;
  name: string;
  image?: string;
  status: string;
  cpu: number;
  memory: { used: number; limit: number };
  network?: { rx: number; tx: number };
  uptime?: number;
}

export interface MetricsHistoryPoint {
  timestamp: number;
  cpu: number;
  memoryPercent: number;
  diskPercent: number;
  networkUp: number;
  networkDown: number;
}

interface DataContextType {
  // Data
  metrics: SystemMetrics | null;
  services: ServiceData[];
  containers: DockerContainerData[];
  metricsHistory: MetricsHistoryPoint[];

  // State
  isLoading: boolean;
  isRefreshing: boolean;
  isConnected: boolean;
  lastUpdate: Date;

  // Network history for sparklines
  netHistory: number[];
  uploadHistory: number[];

  // Actions
  refreshAll: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  refreshServices: () => Promise<void>;
  refreshContainers: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

interface DataProviderProps {
  children: ReactNode;
  initialData?: {
    metrics?: SystemMetrics | null;
    services?: ServiceData[];
    containers?: DockerContainerData[];
    metricsHistory?: MetricsHistoryPoint[];
  };
}

export function DataProvider({ children, initialData }: DataProviderProps) {
  // Initialize state
  const [metrics, setMetrics] = useState<SystemMetrics | null>(initialData?.metrics || null);
  const [services, setServices] = useState<ServiceData[]>(initialData?.services || []);
  const [containers, setContainers] = useState<DockerContainerData[]>(initialData?.containers || []);
  const [metricsHistory, setMetricsHistory] = useState<MetricsHistoryPoint[]>(initialData?.metricsHistory || []);

  // Network history for sparklines (last 20 values)
  const [netHistory, setNetHistory] = useState<number[]>(new Array(20).fill(5));
  const [uploadHistory, setUploadHistory] = useState<number[]>(new Array(20).fill(2));

  const [isLoading, setIsLoading] = useState(!initialData?.metrics);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Track WebSocket setup
  const socketSetup = useRef(false);

  // REST API fallback functions
  const refreshMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setNetHistory(prev => [...prev.slice(1), (data.network?.down || 0) / 1024]);
        setUploadHistory(prev => [...prev.slice(1), (data.network?.up || 0) / 1024]);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    }
  }, []);

  const refreshServices = useCallback(async () => {
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  }, []);

  const refreshContainers = useCallback(async () => {
    try {
      const res = await fetch("/api/containers");
      if (res.ok) {
        const data = await res.json();
        setContainers(data.containers || []);
      }
    } catch (error) {
      console.error("Failed to fetch containers:", error);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics/history?hours=6");
      if (res.ok) {
        const data = await res.json();
        setMetricsHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshMetrics(),
        refreshServices(),
        refreshContainers(),
        refreshHistory(),
      ]);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [refreshMetrics, refreshServices, refreshContainers, refreshHistory]);

  // Set up WebSocket connection and subscriptions
  useEffect(() => {
    if (typeof window === "undefined" || socketSetup.current) return;
    socketSetup.current = true;

    const socket = getSocket();

    // Connection status handlers
    const handleConnect = () => {
      console.log("[DataContext] WebSocket connected");
      setConnected(true);
    };

    const handleDisconnect = () => {
      console.log("[DataContext] WebSocket disconnected");
      setConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Set initial connection state
    setConnected(socket.connected);

    // Subscribe to real-time updates
    const unsubMetrics = subscribeToMetrics((data: MetricsUpdate) => {
      const transformed = transformMetrics(data);
      setMetrics(transformed);
      setNetHistory(prev => [...prev.slice(1), (transformed.network?.down || 0) / 1024]);
      setUploadHistory(prev => [...prev.slice(1), (transformed.network?.up || 0) / 1024]);
      setLastUpdate(new Date());
      setIsLoading(false);
    });

    const unsubContainers = subscribeToContainers((data: ContainerUpdate[]) => {
      const transformed = transformContainers(data);
      setContainers(transformed);
    });

    const unsubServices = subscribeToServices((data: ServiceUpdate[]) => {
      setServices(prev => {
        // Merge with existing service data to preserve metadata
        return prev.map(existing => {
          const update = data.find(s => s.service_id === existing.id);
          if (update) {
            return {
              ...existing,
              status: update.status,
              responseTime: update.response_time,
              uptime: update.uptime_percent ?? existing.uptime,
            };
          }
          return existing;
        });
      });
    });

    const unsubHistory = subscribeToHistory((data: any[]) => {
      const transformed = data.map((point) => ({
        timestamp: point.timestamp,
        cpu: point.cpu_percent || point.cpu,
        memoryPercent: point.memory_percent || point.memoryPercent,
        diskPercent: point.disk_percent || point.diskPercent,
        networkUp: point.network_tx || point.networkUp,
        networkDown: point.network_rx || point.networkDown,
      }));
      setMetricsHistory(transformed);
    });

    // Initial data fetch via REST (WebSocket will take over once data arrives)
    refreshAll();

    // Fallback polling for when WebSocket is disconnected
    const pollInterval = setInterval(() => {
      if (!isConnected()) {
        refreshAll();
      }
    }, 30000);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      unsubMetrics();
      unsubContainers();
      unsubServices();
      unsubHistory();
      clearInterval(pollInterval);
    };
  }, [refreshAll]);

  return (
    <DataContext.Provider
      value={{
        metrics,
        services,
        containers,
        metricsHistory,
        isLoading,
        isRefreshing,
        isConnected: connected,
        lastUpdate,
        netHistory,
        uploadHistory,
        refreshAll,
        refreshMetrics,
        refreshServices,
        refreshContainers,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
