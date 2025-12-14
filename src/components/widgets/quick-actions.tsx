"use client";

import { memo, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap,
  RotateCw,
  Trash2,
  RefreshCw,
  ExternalLink,
  Database,
  Check,
  X,
} from "lucide-react";

interface QuickActionsProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const QuickActions = memo(function QuickActions({
  onRefresh,
  isRefreshing = false,
}: QuickActionsProps) {
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{
    action: string;
    status: "success" | "error";
  } | null>(null);

  const handleAction = async (action: string, callback?: () => void) => {
    setShowConfirm(null);
    setActionStatus({ action, status: "success" });

    // Simulate action
    if (callback) {
      callback();
    }

    // Clear status after 3 seconds
    setTimeout(() => setActionStatus(null), 3000);
  };

  const confirmAction = (action: string) => {
    setShowConfirm(action);
  };

  const cancelAction = () => {
    setShowConfirm(null);
  };

  const externalLinks = [
    {
      id: "appwrite",
      name: "Appwrite Console",
      url: "https://backend.firefetch.org/console",
      icon: Database,
      description: "Backend services",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Quick Actions
        </CardTitle>
      </CardHeader>

      <div className="space-y-6 px-4 pb-4">
        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="text-xs text-text-muted uppercase tracking-wide mb-3">
            System Actions
          </div>

          {showConfirm ? (
            <div className="p-3 bg-border/30 rounded-lg border border-border">
              <p className="text-sm text-text-secondary mb-3">
                Are you sure you want to{" "}
                <span className="font-semibold text-text-primary">{showConfirm}</span>?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleAction(showConfirm, onRefresh)}
                  className="flex-1"
                >
                  <Check className="mr-2 h-3.5 w-3.5" />
                  Confirm
                </Button>
                <Button size="sm" variant="outline" onClick={cancelAction} className="flex-1">
                  <X className="mr-2 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleAction("refresh", onRefresh)}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Force Refresh All Data
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => confirmAction("clear cache")}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Clear Cache
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => confirmAction("restart services")}
              >
                <RotateCw className="mr-2 h-3.5 w-3.5" />
                Restart Services
              </Button>
            </>
          )}
        </div>

        {/* Status Message */}
        {actionStatus && (
          <div
            className={`p-3 rounded-lg border ${
              actionStatus.status === "success"
                ? "bg-success/10 border-success/30 text-success"
                : "bg-error/10 border-error/30 text-error"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionStatus.status === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {actionStatus.status === "success"
                  ? `Successfully executed: ${actionStatus.action}`
                  : `Failed to execute: ${actionStatus.action}`}
              </span>
            </div>
          </div>
        )}

        {/* External Links */}
        <div className="space-y-2">
          <div className="text-xs text-text-muted uppercase tracking-wide mb-3">
            External Tools
          </div>

          <div className="space-y-2">
            {externalLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface/50 hover:bg-border/50 hover:border-border/80 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-border">
                    <link.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{link.name}</div>
                    <div className="text-xs text-text-muted">{link.description}</div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-text-muted group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
});
