import fs from "fs";
import path from "path";

const CACHE_DIR = "/tmp/dashboard-cache";
const METRICS_CACHE_FILE = path.join(CACHE_DIR, "metrics.json");
const SERVICES_CACHE_FILE = path.join(CACHE_DIR, "services.json");
const CONTAINERS_CACHE_FILE = path.join(CACHE_DIR, "containers.json");
const METRICS_HISTORY_FILE = path.join(CACHE_DIR, "metrics-history.json");

interface CachedData<T> {
  data: T;
  timestamp: number;
}

function readCacheFile<T>(filePath: string): T | null {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content) as CachedData<T>;
      return parsed.data;
    }
  } catch (error) {
    console.error(`Failed to read cache file ${filePath}:`, error);
  }
  return null;
}

export interface InitialData {
  metrics: {
    cpu: number;
    memory: { used: number; total: number; percent: number };
    disk: { used: number; total: number; percent: number };
    network: { up: number; down: number };
    uptime: number;
    loadAverage?: number[];
  } | null;
  services: Array<{
    id: string;
    name: string;
    status: string;
    responseTime?: number;
    url?: string;
  }>;
  containers: Array<{
    id: string;
    name: string;
    status: string;
    cpu: number;
    memory: { used: number; limit: number };
  }>;
}

export function getInitialData(): InitialData {
  const metrics = readCacheFile<InitialData["metrics"]>(METRICS_CACHE_FILE);
  const servicesData = readCacheFile<{ services: InitialData["services"] }>(SERVICES_CACHE_FILE);
  const containersData = readCacheFile<{ containers: InitialData["containers"] }>(CONTAINERS_CACHE_FILE);

  return {
    metrics: metrics || null,
    services: servicesData?.services || [],
    containers: containersData?.containers || [],
  };
}

export interface MetricsHistoryPoint {
  timestamp: number;
  cpu: number;
  memoryPercent: number;
  diskPercent: number;
  networkUp: number;
  networkDown: number;
}

export function getMetricsPageData(): {
  metrics: InitialData["metrics"];
  history: MetricsHistoryPoint[];
} {
  const metrics = readCacheFile<InitialData["metrics"]>(METRICS_CACHE_FILE);

  let history: MetricsHistoryPoint[] = [];
  try {
    if (fs.existsSync(METRICS_HISTORY_FILE)) {
      const content = fs.readFileSync(METRICS_HISTORY_FILE, "utf-8");
      history = JSON.parse(content) || [];
    }
  } catch (error) {
    console.error("Failed to read metrics history:", error);
  }

  return {
    metrics: metrics || null,
    history,
  };
}

// Docker container type with full details
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

export function getDockerPageData(): {
  containers: DockerContainerData[];
} {
  const containersData = readCacheFile<{ containers: DockerContainerData[] }>(CONTAINERS_CACHE_FILE);
  return {
    containers: containersData?.containers || [],
  };
}

// Service type with full details
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

export function getServicesPageData(): {
  services: ServiceData[];
} {
  const servicesData = readCacheFile<{ services: ServiceData[] }>(SERVICES_CACHE_FILE);
  return {
    services: servicesData?.services || [],
  };
}
