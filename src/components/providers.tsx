"use client";

import { ReactNode } from "react";
import { SettingsProvider } from "@/contexts/settings-context";
import { DataProvider } from "@/contexts/data-context";
import type { SystemMetrics, ServiceData, DockerContainerData, MetricsHistoryPoint } from "@/contexts/data-context";

interface ProvidersProps {
  children: ReactNode;
  initialData?: {
    metrics?: SystemMetrics | null;
    services?: ServiceData[];
    containers?: DockerContainerData[];
    metricsHistory?: MetricsHistoryPoint[];
  };
}

export function Providers({ children, initialData }: ProvidersProps) {
  return (
    <SettingsProvider>
      <DataProvider initialData={initialData}>
        {children}
      </DataProvider>
    </SettingsProvider>
  );
}
