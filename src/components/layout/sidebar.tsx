"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Server,
  Container,
  Activity,
  Settings,
  ExternalLink,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/contexts/settings-context";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Services", href: "/services", icon: Server },
  { name: "Docker", href: "/docker", icon: Container },
  { name: "Metrics", href: "/metrics", icon: Activity },
];

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active: boolean;
}

function SidebarItem({ icon: Icon, label, href, active }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center w-full p-3 mb-1 rounded-xl transition-all duration-300 group relative overflow-hidden",
        active
          ? "text-white shadow-lg shadow-purple-500/20"
          : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
      )}
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-purple-600/80 opacity-100" />
      )}
      <div className="relative z-10 flex items-center w-full">
        <Icon
          size={20}
          className={cn(
            "shrink-0 transition-colors",
            active ? "text-white" : "text-gray-400 group-hover:text-white"
          )}
        />
        <span className="ml-3 font-medium text-sm whitespace-nowrap">
          {label}
        </span>
        {active && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
        )}
      </div>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { settings } = useSettings();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900/80 backdrop-blur-xl border-r border-white/5 transition-all duration-300 flex flex-col shadow-2xl">
      {/* Logo */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
            <Zap size={22} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight leading-none text-white">
              Fire<span className="text-purple-400">Fetch</span>
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
              Dashboard
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-4 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => (
            <SidebarItem
              key={item.name}
              icon={item.icon}
              label={item.name}
              href={item.href}
              active={pathname === item.href}
            />
          ))}
        </div>

        {/* Quick Links */}
        {settings.quickLinks.length > 0 && (
          <div className="mt-8 animate-fade-in">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pl-3">
              Quick Links
            </h4>
            <div className="space-y-1">
              {settings.quickLinks.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-all duration-300 group"
                >
                  <ExternalLink size={18} className="shrink-0 text-gray-500 group-hover:text-gray-300" />
                  <span className="text-sm font-medium truncate">{item.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="mt-6">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pl-3">
            System Status
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-gray-300 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors cursor-pointer group">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-white group-hover:text-emerald-300 transition-colors">
                  Server Node
                </span>
                <span className="text-[10px] text-gray-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 bg-black/10">
        <SidebarItem
          icon={Settings}
          label="Settings"
          href="/settings"
          active={pathname === "/settings"}
        />

        {/* User Info */}
        <div className="mt-3 flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 ring-2 ring-white/10" />
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white">Admin</div>
            <div className="text-[10px] text-gray-400 truncate">dashboard.firefetch.org</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
