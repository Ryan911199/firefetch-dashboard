export interface Service {
  id: string;
  name: string;
  subdomain: string;
  url: string;
  internalPort: number;
  description: string;
  status: "online" | "offline" | "degraded" | "unknown";
  projectPath?: string;
  responseTime?: number;
  uptime?: number;
  lastChecked?: Date;
}

export interface SystemMetrics {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percent: number;
  };
  disk: {
    used: number;
    total: number;
    percent: number;
  };
  network: {
    up: number;
    down: number;
  };
  uptime: number;
  loadAverage?: number[];
  timestamp?: Date;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "restarting" | "paused";
  uptime?: number;
  cpu: number;
  memory: {
    used: number;
    limit: number;
  };
  network?: {
    rx: number;
    tx: number;
  };
}

export interface DashboardData {
  services: Service[];
  metrics: SystemMetrics;
  containers: DockerContainer[];
}

export interface ActivityEvent {
  id: string;
  type: "status_change" | "alert" | "threshold_breach" | "info";
  severity: "info" | "warning" | "error" | "success";
  title: string;
  description: string;
  timestamp: Date;
  source?: string;
}

export interface HealthScore {
  overall: number; // 0-100
  cpu: number;
  memory: number;
  disk: number;
  services: number;
  trend?: "up" | "down" | "stable";
}

export interface NetworkHistory {
  timestamp: number;
  upload: number;
  download: number;
  connections?: number;
}
