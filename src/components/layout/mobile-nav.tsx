"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Server,
  Container,
  Activity,
  Settings,
  ExternalLink,
  Menu,
  X,
  Zap,
  BarChart2,
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

export function MobileNav() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden safe-top">
        <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 mx-0 px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-purple-500/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">
              Fire<span className="text-purple-400">Fetch</span>
            </span>
          </Link>

          {/* Quick Status & Menu */}
          <div className="flex items-center gap-3">
            {/* Status dot */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Online</span>
            </div>

            {/* Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                isOpen
                  ? "bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              )}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Menu Panel */}
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 z-40 w-80 max-w-[85vw] transition-transform duration-300 ease-out lg:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="h-full bg-slate-900/95 backdrop-blur-xl border-l border-white/5 overflow-hidden flex flex-col shadow-2xl">
          {/* Menu Header */}
          <div className="p-4 border-b border-white/5 bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-purple-500/20">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Fire<span className="text-purple-400">Fetch</span>
                  </h2>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Dashboard</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto scrollbar-hide">
            <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Navigation
            </p>
            <div className="space-y-1">
              {navigation.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group relative overflow-hidden animate-slide-in-right",
                      isActive
                        ? "text-white shadow-lg shadow-purple-500/20"
                        : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-purple-600/80 opacity-100" />
                    )}
                    <div className="relative z-10 flex items-center w-full">
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                        )}
                      />
                      <span className="ml-3 font-medium text-sm">{item.name}</span>
                      {isActive && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Quick Links */}
            {settings.quickLinks.length > 0 && (
              <>
                <p className="px-3 mt-6 mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Quick Links
                </p>
                <div className="space-y-1">
                  {settings.quickLinks.map((item, index) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-all duration-300 group animate-slide-in-right"
                      style={{ animationDelay: `${(navigation.length + index) * 50}ms` }}
                    >
                      <ExternalLink className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-gray-300" />
                      <span className="text-sm font-medium truncate">{item.name}</span>
                    </a>
                  ))}
                </div>
              </>
            )}

            {/* External Tools */}
            <div className="mt-6">
              <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                External Tools
              </p>
              <a
                href="https://beszel.firefetch.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-all duration-300 group"
              >
                <BarChart2 className="h-5 w-5 shrink-0 text-cyan-400 group-hover:text-cyan-300" />
                <span className="text-sm font-medium">Beszel</span>
                <ExternalLink className="h-3 w-3 ml-auto text-gray-600 group-hover:text-gray-400" />
              </a>
            </div>

            {/* System Status */}
            <div className="mt-6">
              <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                System Status
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-300 p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-white">Server Node</span>
                  <span className="text-[10px] text-gray-500">Active</span>
                </div>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 bg-black/10">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                pathname === "/settings"
                  ? "text-white shadow-lg shadow-purple-500/20"
                  : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
              )}
            >
              {pathname === "/settings" && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-purple-600/80 opacity-100" />
              )}
              <div className="relative z-10 flex items-center w-full">
                <Settings
                  className={cn(
                    "h-5 w-5 shrink-0",
                    pathname === "/settings" ? "text-white" : "text-gray-400 group-hover:text-white"
                  )}
                />
                <span className="ml-3 font-medium text-sm">Settings</span>
              </div>
            </Link>

            {/* User Info */}
            <div className="mt-3 flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 ring-2 ring-white/10" />
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white">Admin</div>
                <div className="text-[10px] text-gray-400 truncate">dashboard.firefetch.org</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden safe-bottom">
        <div className="bg-slate-900/90 backdrop-blur-xl border-t border-white/5 px-2 py-1.5">
          <div className="flex items-center justify-around">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[64px]",
                    isActive
                      ? "text-white"
                      : "text-white/40 hover:text-white/70"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-all",
                    isActive && "bg-gradient-to-r from-blue-600/80 to-purple-600/80"
                  )}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    isActive && "text-purple-300"
                  )}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
