"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, Clock, Zap } from "lucide-react";

export interface Service {
  id: string;
  name: string;
  url: string;
  status: "online" | "offline" | "degraded" | "unknown";
  responseTime?: number;
  uptime?: number;
  description?: string;
}

interface ServiceCardProps {
  service: Service;
}

export const ServiceCard = memo(function ServiceCard({ service }: ServiceCardProps) {
  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <Card
        className="group cursor-pointer transition-all hover:glow-primary h-full"
        hover
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StatusDot status={service.status} size="md" />
            <div>
              <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                {service.name}
              </h3>
              <div className="flex items-center gap-1 text-sm text-text-secondary">
                {new URL(service.url).hostname}
                <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>
          </div>
        </div>

        {service.description && (
          <p className="mt-3 text-sm text-text-muted line-clamp-2">{service.description}</p>
        )}

        <div className="mt-4 flex items-center gap-4 text-sm">
          {service.responseTime !== undefined && (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Zap className="h-3.5 w-3.5" />
              <span>{service.responseTime}ms</span>
            </div>
          )}
          {service.uptime !== undefined && (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Clock className="h-3.5 w-3.5" />
              <span>{service.uptime.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {service.uptime !== undefined && (
          <div className="mt-3">
            <Progress value={service.uptime} size="sm" color="success" />
          </div>
        )}
      </Card>
    </a>
  );
});

interface ServiceGridProps {
  services: Service[];
}

export const ServiceGrid = memo(function ServiceGrid({ services }: ServiceGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
});
