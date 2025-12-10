import { NextResponse } from "next/server";
import fs from "fs";
import { getLatestServiceStatus, getServiceHistory, getDb } from "@/lib/database";

export const dynamic = "force-dynamic";

interface ServiceConfig {
  name: string;
  subdomain: string;
  url: string;
  internal_port: number;
  description: string;
  project_path?: string;
}

interface ServicesJson {
  services: ServiceConfig[];
}

function loadServicesConfig(): ServiceConfig[] {
  try {
    const configPaths = [
      process.env.SERVICES_CONFIG_PATH,
      "/app/config/services.json",
      "/home/ubuntu/ai/infrastructure/services.json",
    ].filter(Boolean) as string[];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, "utf-8")) as ServicesJson;
        return data.services || [];
      }
    }
    return [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    // Ensure database is initialized
    getDb();

    const url = new URL(request.url);
    const serviceId = url.searchParams.get("serviceId");
    const hours = parseInt(url.searchParams.get("hours") || "24", 10);

    // If serviceId is provided, return history for that service
    if (serviceId) {
      const history = getServiceHistory(serviceId, hours);
      return NextResponse.json({
        serviceId,
        history: history.map((s) => ({
          timestamp: s.timestamp,
          status: s.status,
          responseTime: s.response_time,
          uptime: s.uptime_percent,
        })),
        count: history.length,
      });
    }

    // Get latest service status from database
    const dbServices = getLatestServiceStatus();

    // Get service configs for additional metadata
    const configs = loadServicesConfig();

    // Merge database status with config data
    const services = configs.map((config) => {
      const dbService = dbServices.find((s) => s.service_id === config.subdomain);

      return {
        id: config.subdomain,
        name: config.name,
        subdomain: config.subdomain,
        url: config.url,
        internalPort: config.internal_port,
        description: config.description,
        projectPath: config.project_path,
        status: dbService?.status || "unknown",
        responseTime: dbService?.response_time,
        uptime: dbService?.uptime_percent ?? (dbService?.status === "online" ? 99.9 : 0),
        lastChecked: dbService?.timestamp ? new Date(dbService.timestamp) : undefined,
      };
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
