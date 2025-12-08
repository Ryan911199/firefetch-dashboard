"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";

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
  subdomain: string;
  description: string;
  internalPort: number;
  status: string;
  responseTime?: number;
  uptime?: number;
  url?: string;
}

export interface DockerContainerData {
  id: string;
  name: string;
  image: string;
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

interface CachedData {
  metrics: SystemMetrics | null;
  services: ServiceData[];
  containers: DockerContainerData[];
  metricsHistory: MetricsHistoryPoint[];
  netHistory: number[];
  uploadHistory: number[];
  timestamp: number;
}

const CACHE_KEY = "dashboard-data-cache";
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes max age for cache

// Synchronously read from localStorage
function getLocalStorageCache(): CachedData | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as CachedData;
      // Check if cache is not too old
      if (Date.now() - data.timestamp < CACHE_MAX_AGE) {
        return data;
      }
    }
  } catch (e) {
    console.error("Failed to read cache:", e);
  }
  return null;
}

// Save to localStorage
function saveToLocalStorage(data: CachedData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save cache:", e);
  }
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

// Get initial state - prefer localStorage, fallback to server data
function getInitialState(initialData?: DataProviderProps["initialData"]) {
  const cached = getLocalStorageCache();

  if (cached) {
    return {
      metrics: cached.metrics,
      services: cached.services,
      containers: cached.containers,
      metricsHistory: cached.metricsHistory,
      netHistory: cached.netHistory,
      uploadHistory: cached.uploadHistory,
      isLoading: false,
    };
  }

  // Fallback to server initial data
  const defaultNetHistory = new Array(20).fill(5);
  const defaultUploadHistory = new Array(20).fill(2);

  if (initialData?.metrics?.network?.down) {
    defaultNetHistory[19] = initialData.metrics.network.down / 1024;
  }
  if (initialData?.metrics?.network?.up) {
    defaultUploadHistory[19] = initialData.metrics.network.up / 1024;
  }

  return {
    metrics: initialData?.metrics || null,
    services: initialData?.services || [],
    containers: initialData?.containers || [],
    metricsHistory: initialData?.metricsHistory || [],
    netHistory: defaultNetHistory,
    uploadHistory: defaultUploadHistory,
    isLoading: !initialData?.metrics,
  };
}

export function DataProvider({ children, initialData }: DataProviderProps) {
  // Initialize state synchronously from cache or server data
  const initial = getInitialState(initialData);

  const [metrics, setMetrics] = useState<SystemMetrics | null>(initial.metrics);
  const [services, setServices] = useState<ServiceData[]>(initial.services);
  const [containers, setContainers] = useState<DockerContainerData[]>(initial.containers);
  const [metricsHistory, setMetricsHistory] = useState<MetricsHistoryPoint[]>(initial.metricsHistory);
  const [netHistory, setNetHistory] = useState<number[]>(initial.netHistory);
  const [uploadHistory, setUploadHistory] = useState<number[]>(initial.uploadHistory);

  const [isLoading, setIsLoading] = useState(initial.isLoading);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Track if we've done initial fetch
  const hasInitialFetch = useRef(false);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (metrics || services.length > 0 || containers.length > 0) {
      saveToLocalStorage({
        metrics,
        services,
        containers,
        metricsHistory,
        netHistory,
        uploadHistory,
        timestamp: Date.now(),
      });
    }
  }, [metrics, services, containers, metricsHistory, netHistory, uploadHistory]);

  const refreshMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setNetHistory(prev => [...prev.slice(1), (data.network?.down || 0) / 1024]);
        setUploadHistory(prev => [...prev.slice(1), (data.network?.up || 0) / 1024]);
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
      setLastUpdate(new Date());
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [refreshMetrics, refreshServices, refreshContainers, refreshHistory]);

  // Initial load and periodic refresh
  useEffect(() => {
    // Only do initial fetch once
    if (hasInitialFetch.current) return;
    hasInitialFetch.current = true;

    // Always fetch fresh data in background, but don't block UI
    // Small delay to let the UI render first with cached data
    const timeoutId = setTimeout(() => {
      refreshAll();
    }, 100);

    // Refresh all data every 30 seconds
    const interval = setInterval(() => {
      refreshAll();
    }, 30000);

    // Refresh history every 5 minutes
    const historyInterval = setInterval(() => {
      refreshHistory();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
      clearInterval(historyInterval);
    };
  }, [refreshAll, refreshHistory]);

  return (
    <DataContext.Provider
      value={{
        metrics,
        services,
        containers,
        metricsHistory,
        isLoading,
        isRefreshing,
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
