"use client";

import { Bell, Wifi, WifiOff } from "lucide-react";
import { useData } from "@/contexts/data-context";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { isConnected, lastUpdate } = useData();

  const formatLastUpdate = () => {
    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();
    if (diff < 5000) return "just now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastUpdate.toLocaleTimeString();
  };

  return (
    <header className="sticky top-0 z-30 hidden lg:flex h-16 items-center justify-between border-b border-white/5 bg-background/60 px-6 backdrop-blur-xl">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold text-white truncate">{title}</h1>
        {subtitle && <p className="text-sm text-white/50 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 ml-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
          {isConnected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs text-white/60">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-xs text-white/60">Polling</span>
            </>
          )}
          <span className="text-xs text-white/40">
            {formatLastUpdate()}
          </span>
        </div>

        {/* Notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" aria-label="Unread notifications" />
        </button>
      </div>
    </header>
  );
}
