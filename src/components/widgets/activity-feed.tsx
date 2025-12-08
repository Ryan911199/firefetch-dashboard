"use client";

import { memo, useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";

export interface ActivityEvent {
  id: string;
  type: "status_change" | "alert" | "threshold_breach" | "info";
  severity: "info" | "warning" | "error" | "success";
  title: string;
  description: string;
  timestamp: Date;
  source?: string;
}

interface ActivityFeedProps {
  maxItems?: number;
  autoScroll?: boolean;
}

// In-memory storage (will be replaced with Appwrite later)
let activityStore: ActivityEvent[] = [];

export const addActivity = (event: Omit<ActivityEvent, "id" | "timestamp">) => {
  const newEvent: ActivityEvent = {
    ...event,
    id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };

  activityStore = [newEvent, ...activityStore].slice(0, 100); // Keep last 100 events

  // Trigger custom event for live updates
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("activity-added", { detail: newEvent }));
  }
};

export const getActivities = (): ActivityEvent[] => {
  return activityStore;
};

export const clearActivities = () => {
  activityStore = [];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("activities-cleared"));
  }
};

export const ActivityFeed = memo(function ActivityFeed({
  maxItems = 10,
  autoScroll = false,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    // Load initial activities
    setActivities(getActivities().slice(0, maxItems));

    // Listen for new activities
    const handleActivityAdded = (event: Event) => {
      const customEvent = event as CustomEvent<ActivityEvent>;
      setActivities((prev) => [customEvent.detail, ...prev].slice(0, maxItems));
    };

    const handleActivitiesCleared = () => {
      setActivities([]);
    };

    window.addEventListener("activity-added", handleActivityAdded);
    window.addEventListener("activities-cleared", handleActivitiesCleared);

    // Add some sample activities if empty
    if (activityStore.length === 0) {
      addActivity({
        type: "info",
        severity: "success",
        title: "Dashboard Started",
        description: "FireFetch Dashboard initialized successfully",
        source: "System",
      });

      addActivity({
        type: "status_change",
        severity: "success",
        title: "Service Online",
        description: "Research service is now online",
        source: "research",
      });

      addActivity({
        type: "threshold_breach",
        severity: "warning",
        title: "CPU Usage High",
        description: "CPU usage exceeded 80% threshold",
        source: "System Metrics",
      });
    }

    return () => {
      window.removeEventListener("activity-added", handleActivityAdded);
      window.removeEventListener("activities-cleared", handleActivitiesCleared);
    };
  }, [maxItems]);

  const getIcon = (event: ActivityEvent) => {
    switch (event.type) {
      case "status_change":
        return event.severity === "success" ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        );
      case "alert":
        return <Bell className="h-4 w-4" />;
      case "threshold_breach":
        return event.description.includes("exceeded") ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        );
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: ActivityEvent["severity"]) => {
    switch (severity) {
      case "error":
        return "text-error border-error/30 bg-error/10";
      case "warning":
        return "text-warning border-warning/30 bg-warning/10";
      case "success":
        return "text-success border-success/30 bg-success/10";
      default:
        return "text-primary border-primary/30 bg-primary/10";
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    if (seconds > 10) return `${seconds}s ago`;
    return "just now";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Recent Activity
          </CardTitle>
          {activities.length > 0 && (
            <button
              onClick={() => clearActivities()}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </CardHeader>

      <div className="px-4 pb-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {activities.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg border ${getSeverityColor(event.severity)} transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(event)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-text-primary truncate">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                      {event.description}
                    </p>
                    {event.source && (
                      <div className="text-xs text-text-muted mt-1 opacity-75">
                        Source: {event.source}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
});
