import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "stat" | "gradient";
  hover?: boolean;
  glow?: "accent" | "primary" | "success" | "error" | "none";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  className,
  variant = "default",
  hover = false,
  glow = "none",
  padding = "md",
}: CardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-5 sm:p-6",
  };

  const variantClasses = {
    default: "glass-card",
    glass: "glass-surface rounded-2xl",
    stat: "stat-card",
    gradient: "gradient-border glass-card",
  };

  const glowClasses = {
    none: "",
    accent: "glow-accent",
    primary: "glow-primary",
    success: "glow-success",
    error: "glow-error",
  };

  return (
    <div
      className={cn(
        variantClasses[variant],
        paddingClasses[padding],
        hover && "glass-card-hover cursor-pointer transition-all duration-300",
        glowClasses[glow],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-3 sm:mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  gradient = false,
}: {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
}) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold tracking-wide",
        gradient ? "text-gradient" : "text-white/90",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("", className)}>{children}</div>;
}

// New: Stat card for metrics display
interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: "accent" | "primary" | "success" | "warning" | "error";
  className?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  icon,
  trend,
  color = "accent",
  className,
}: StatCardProps) {
  const colorClasses = {
    accent: "from-accent/20 to-accent/5 border-accent/20",
    primary: "from-primary/20 to-primary/5 border-primary/20",
    success: "from-success/20 to-success/5 border-success/20",
    warning: "from-warning/20 to-warning/5 border-warning/20",
    error: "from-error/20 to-error/5 border-error/20",
  };

  const iconColorClasses = {
    accent: "text-accent",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-4",
        "bg-gradient-to-br border",
        "backdrop-blur-xl",
        colorClasses[color],
        className
      )}
    >
      {/* Background glow effect */}
      <div className={cn(
        "absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-30",
        color === "accent" && "bg-accent",
        color === "primary" && "bg-primary",
        color === "success" && "bg-success",
        color === "warning" && "bg-warning",
        color === "error" && "bg-error",
      )} />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-white truncate">
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-white/40 mt-1 truncate">{subValue}</p>
          )}
        </div>
        {icon && (
          <div className={cn("flex-shrink-0 ml-3", iconColorClasses[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// New: Compact metric display for mobile
interface MetricBadgeProps {
  label: string;
  value: string | number;
  color?: "accent" | "primary" | "success" | "warning" | "error";
  className?: string;
}

export function MetricBadge({ label, value, color = "accent", className }: MetricBadgeProps) {
  const colorClasses = {
    accent: "bg-accent/10 border-accent/20 text-accent",
    primary: "bg-primary/10 border-primary/20 text-primary",
    success: "bg-success/10 border-success/20 text-success",
    warning: "bg-warning/10 border-warning/20 text-warning",
    error: "bg-error/10 border-error/20 text-error",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border",
        "backdrop-blur-sm",
        colorClasses[color],
        className
      )}
    >
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
