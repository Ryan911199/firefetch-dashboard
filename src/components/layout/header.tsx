"use client";

import { Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 hidden lg:flex h-16 items-center justify-between border-b border-white/5 bg-background/60 px-6 backdrop-blur-xl">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold text-white truncate">{title}</h1>
        {subtitle && <p className="text-sm text-white/50 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 ml-4">
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
