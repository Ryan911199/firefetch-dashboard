"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/settings-context";
import {
  Monitor,
  Bell,
  Link as LinkIcon,
  Info,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Zap,
} from "lucide-react";

export default function SettingsPage() {
  const {
    settings,
    updateDisplay,
    updateNotifications,
    addQuickLink,
    removeQuickLink,
    resetSettings,
  } = useSettings();

  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [showAddLink, setShowAddLink] = useState(false);

  const handleAddQuickLink = () => {
    if (newLinkName && newLinkUrl) {
      addQuickLink({
        name: newLinkName,
        url: newLinkUrl,
        external: newLinkUrl.startsWith("http"),
      });
      setNewLinkName("");
      setNewLinkUrl("");
      setShowAddLink(false);
    }
  };

  const refreshIntervalOptions = [
    { value: 0, label: "Manual" },
    { value: 15, label: "15 seconds" },
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 300, label: "5 minutes" },
  ];

  const cardsPerRowOptions = [
    { value: 1, label: "1 card" },
    { value: 2, label: "2 cards" },
    { value: 3, label: "3 cards" },
    { value: 4, label: "4 cards" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 pb-20 lg:pt-0 lg:pb-0">
        <div className="p-3 sm:p-4 lg:p-6 max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Settings</h1>
            <p className="text-xs sm:text-sm text-white/50 mt-0.5">
              Configure your dashboard
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Display Settings */}
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Monitor className="w-4 h-4 text-accent" />
                </div>
                <h3 className="text-sm font-semibold text-white">Display Settings</h3>
              </div>

              <div className="space-y-4">
                {/* Refresh Interval */}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-white">Auto-refresh</h4>
                    <p className="text-xs text-white/40">How often to refresh data</p>
                  </div>
                  <Select
                    value={settings.display.refreshInterval}
                    onValueChange={(value) =>
                      updateDisplay({ refreshInterval: Number(value) as any })
                    }
                    options={refreshIntervalOptions}
                    className="w-32 sm:w-40"
                  />
                </div>

                {/* Cards Per Row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-white">Cards Per Row</h4>
                    <p className="text-xs text-white/40">Desktop layout</p>
                  </div>
                  <Select
                    value={settings.display.cardsPerRow}
                    onValueChange={(value) =>
                      updateDisplay({ cardsPerRow: Number(value) })
                    }
                    options={cardsPerRowOptions}
                    className="w-32 sm:w-40"
                  />
                </div>

                {/* View Mode */}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-white">View Mode</h4>
                    <p className="text-xs text-white/40">Layout density</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateDisplay({ viewMode: "comfortable" })}
                      className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                        settings.display.viewMode === "comfortable"
                          ? "bg-gradient-to-r from-accent to-primary text-white"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      Comfortable
                    </button>
                    <button
                      onClick={() => updateDisplay({ viewMode: "compact" })}
                      className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                        settings.display.viewMode === "compact"
                          ? "bg-gradient-to-r from-accent to-primary text-white"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      Compact
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Notifications */}
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Bell className="w-4 h-4 text-warning" />
                </div>
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                  UI Only
                </span>
              </div>

              <div className="space-y-4">
                {/* Enable Notifications */}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-white">Browser Notifications</h4>
                    <p className="text-xs text-white/40">Alerts for thresholds (coming soon)</p>
                  </div>
                  <Switch
                    checked={settings.notifications.enabled}
                    onCheckedChange={(checked) =>
                      updateNotifications({ enabled: checked })
                    }
                  />
                </div>

                {/* Thresholds */}
                {settings.notifications.enabled && (
                  <div className="p-3 rounded-xl bg-white/[0.02] space-y-3">
                    <h4 className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                      Alert Thresholds
                    </h4>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <label className="text-xs sm:text-sm text-white/60">CPU Usage</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={settings.notifications.cpuThreshold}
                            onChange={(e) =>
                              updateNotifications({ cpuThreshold: Number(e.target.value) })
                            }
                            className="w-16 sm:w-20 text-right"
                          />
                          <span className="text-xs text-white/40">%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <label className="text-xs sm:text-sm text-white/60">Memory Usage</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={settings.notifications.memoryThreshold}
                            onChange={(e) =>
                              updateNotifications({ memoryThreshold: Number(e.target.value) })
                            }
                            className="w-16 sm:w-20 text-right"
                          />
                          <span className="text-xs text-white/40">%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <label className="text-xs sm:text-sm text-white/60">Disk Usage</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={settings.notifications.diskThreshold}
                            onChange={(e) =>
                              updateNotifications({ diskThreshold: Number(e.target.value) })
                            }
                            className="w-16 sm:w-20 text-right"
                          />
                          <span className="text-xs text-white/40">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Services Management */}
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <RefreshCw className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-white">Services</h3>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02]">
                <p className="text-xs sm:text-sm text-white/60 mb-3">
                  Services are managed through the services.json file. The dashboard auto-detects and monitors all configured services.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-white/40">Location:</span>
                    <code className="px-2 py-1 rounded-lg bg-white/5 font-mono text-accent text-[10px] sm:text-xs truncate">
                      /home/ubuntu/ai/infrastructure/services.json
                    </code>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Links */}
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-success/10">
                  <LinkIcon className="w-4 h-4 text-success" />
                </div>
                <h3 className="text-sm font-semibold text-white">Quick Links</h3>
              </div>

              <div className="space-y-3">
                {settings.quickLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ExternalLink className="h-4 w-4 text-white/40 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{link.name}</p>
                        <p className="text-xs text-white/40 truncate">{link.url}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeQuickLink(link.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-error flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {showAddLink ? (
                  <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
                    <h4 className="text-sm font-medium text-white">Add Quick Link</h4>
                    <div className="space-y-2">
                      <Input
                        placeholder="Link name"
                        value={newLinkName}
                        onChange={(e) => setNewLinkName(e.target.value)}
                      />
                      <Input
                        placeholder="https://example.com"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddQuickLink}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-accent to-primary text-white transition-all hover:opacity-90"
                      >
                        <Save className="h-3 w-3" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowAddLink(false);
                          setNewLinkName("");
                          setNewLinkUrl("");
                        }}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddLink(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all w-full justify-center"
                  >
                    <Plus className="h-4 w-4" />
                    Add Quick Link
                  </button>
                )}
              </div>
            </Card>

            {/* About */}
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Info className="w-4 h-4 text-accent" />
                </div>
                <h3 className="text-sm font-semibold text-white">About</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Dashboard Version</span>
                  <code className="px-2 py-1 rounded-lg bg-accent/10 text-xs font-mono text-accent">
                    v{settings.version}
                  </code>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                    Related Services
                  </h4>
                  <div className="grid gap-2">
                    {[
                      { name: "Appwrite Console", url: "https://backend.firefetch.org/console" },
                    ].map((service) => (
                      <a
                        key={service.name}
                        href={service.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] text-sm text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
                      >
                        <span>{service.name}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Reset */}
            <div className="flex justify-end">
              <button
                onClick={resetSettings}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-error/10 text-error transition-all hover:bg-error/20"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
