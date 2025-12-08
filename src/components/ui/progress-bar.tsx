"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  colorStart?: string;
  colorEnd?: string;
  label?: string;
  subLabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProgressBar({
  value,
  colorStart = "blue",
  colorEnd = "purple",
  label,
  subLabel,
  size = "md",
  className
}: ProgressBarProps) {
  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3"
  };

  // Map color names to Tailwind gradient classes
  const gradientMap: Record<string, string> = {
    "blue-indigo": "from-blue-500 to-indigo-500",
    "blue-purple": "from-blue-500 to-purple-500",
    "purple-fuchsia": "from-purple-500 to-fuchsia-500",
    "purple-pink": "from-purple-500 to-pink-500",
    "emerald-teal": "from-emerald-500 to-teal-500",
    "blue-cyan": "from-blue-600 to-cyan-500",
    "red-orange": "from-red-500 to-orange-500",
  };

  const gradientKey = `${colorStart}-${colorEnd}`;
  const gradientClass = gradientMap[gradientKey] || `from-${colorStart}-500 to-${colorEnd}-500`;

  // Map color names to shadow classes
  const shadowMap: Record<string, string> = {
    "blue": "shadow-blue-500/30",
    "purple": "shadow-purple-500/30",
    "emerald": "shadow-emerald-500/30",
    "red": "shadow-red-500/30",
  };

  const shadowClass = shadowMap[colorStart] || "shadow-blue-500/30";

  return (
    <div className={cn("w-full", className)}>
      {(label || subLabel) && (
        <div className="flex justify-between mb-2">
          {label && <span className="text-xs font-medium text-gray-300">{label}</span>}
          {subLabel && <span className="text-xs font-mono text-gray-400/80">{subLabel}</span>}
        </div>
      )}
      <div className={cn(
        "w-full bg-slate-900/50 rounded-full overflow-hidden border border-white/5",
        sizeClasses[size]
      )}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            `shadow-lg ${shadowClass}`
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        >
          <div className={cn(
            "w-full h-full bg-gradient-to-r relative overflow-hidden",
            gradientClass
          )}>
            <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
          </div>
        </div>
      </div>
    </div>
  );
}
