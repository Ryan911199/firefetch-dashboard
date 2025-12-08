import { cn } from "@/lib/utils";

type Status = "online" | "offline" | "degraded" | "unknown";

interface StatusDotProps {
  status: Status;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ status, size = "md", pulse = true, className }: StatusDotProps) {
  const sizeClass = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  }[size];

  const colorClass = {
    online: "bg-success",
    offline: "bg-error",
    degraded: "bg-warning",
    unknown: "bg-text-muted",
  }[status];

  const glowClass = {
    online: "shadow-[0_0_8px_rgba(34,197,94,0.5)]",
    offline: "shadow-[0_0_8px_rgba(239,68,68,0.5)]",
    degraded: "shadow-[0_0_8px_rgba(245,158,11,0.5)]",
    unknown: "",
  }[status];

  return (
    <span className={cn("relative inline-flex", className)}>
      <span className={cn("rounded-full", sizeClass, colorClass, glowClass)} />
      {pulse && status === "online" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            colorClass
          )}
        />
      )}
    </span>
  );
}
