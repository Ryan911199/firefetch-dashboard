import { NextResponse } from "next/server";
import fs from "fs";
import { getUptimeMonitors, mapUptimeStatus, UptimeMonitor } from "@/lib/uptime-kuma";
import {
  getServicesCache,
  setServicesCache,
  checkServiceStatusChanges,
} from "@/lib/cache-manager";

export const dynamic = "force-dynamic";

interface ServiceConfig {
  name: string;
  subdomain: string;
  url: string;
  internal_port: number;
  description: string;
  status: string;
  project_path?: string;
}

interface ServicesJson {
  services: ServiceConfig[];
}

// Cache for uptime monitors to avoid multiple API calls
let cachedMonitors: UptimeMonitor[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 60 seconds for uptime kuma data

async function getCachedMonitors(): Promise<UptimeMonitor[]> {
  const now = Date.now();
  if (now - cacheTimestamp > CACHE_DURATION || cachedMonitors.length === 0) {
    try {
      cachedMonitors = await getUptimeMonitors();
      cacheTimestamp = now;
    } catch (error) {
      console.error("Failed to fetch Uptime Kuma monitors:", error);
    }
  }
  return cachedMonitors;
}

function findMonitorForUrl(monitors: UptimeMonitor[], url: string): UptimeMonitor | undefined {
  const targetUrl = url.toLowerCase().replace(/\/$/, "");
  return monitors.find((m) => {
    const monitorUrl = m.url?.toLowerCase().replace(/\/$/, "");
    return monitorUrl === targetUrl;
  });
}

async function fetchFreshServices() {
  // Read services from infrastructure services.json
  const servicesPath = "/home/ubuntu/ai/infrastructure/services.json";
  const servicesData = JSON.parse(fs.readFileSync(servicesPath, "utf-8")) as ServicesJson;

  // Fetch ALL uptime monitors ONCE (using cache)
  const allMonitors = await getCachedMonitors();

  // Process services in parallel, but use cached monitor data
  const servicesWithStatus = await Promise.all(
    servicesData.services.map(async (service) => {
      let status: "online" | "offline" | "degraded" | "unknown" = "unknown";
      let responseTime: number | undefined;
      let uptime: number | undefined;
      let lastChecked: Date | undefined;

      // Try to find matching monitor from cached data
      const monitor = findMonitorForUrl(allMonitors, service.url);

      if (monitor) {
        status = mapUptimeStatus(monitor);
        responseTime = monitor.avgPing || monitor.lastHeartbeat?.ping || 0;
        uptime = monitor.uptime24h || monitor.uptime || 0;
        lastChecked = monitor.lastHeartbeat?.time
          ? new Date(monitor.lastHeartbeat.time)
          : undefined;
      }

      // Only do direct health check if no Uptime Kuma data
      if (status === "unknown") {
        try {
          const startTime = Date.now();
          const response = await fetch(service.url, {
            method: "HEAD",
            signal: AbortSignal.timeout(2000), // Reduced to 2s
          });
          responseTime = Date.now() - startTime;

          if (response.ok || response.status === 301 || response.status === 302 || response.status === 401) {
            status = "online";
          } else if (response.status >= 500) {
            status = "offline";
          } else {
            status = "degraded";
          }
        } catch {
          status = "offline";
        }
      }

      return {
        id: service.subdomain,
        name: service.name,
        subdomain: service.subdomain,
        url: service.url,
        internalPort: service.internal_port,
        description: service.description,
        status,
        responseTime,
        projectPath: service.project_path,
        uptime: uptime !== undefined ? uptime : (status === "online" ? 99.9 : 0),
        lastChecked,
      };
    })
  );

  return servicesWithStatus;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getServicesCache();
      if (cached && !cached.stale) {
        return NextResponse.json({
          services: cached.data,
          cached: true,
          cacheAge: Date.now() - cached.timestamp,
        });
      }
    }

    // Fetch fresh services
    const services = await fetchFreshServices();

    // Update cache
    setServicesCache(services);

    // Check for status changes and create notifications
    checkServiceStatusChanges(services);

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Failed to fetch services:", error);

    // Try to return stale cache if available
    const cached = getServicesCache();
    if (cached) {
      return NextResponse.json({
        services: cached.data,
        cached: true,
        stale: true,
        cacheAge: Date.now() - cached.timestamp,
      });
    }

    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
