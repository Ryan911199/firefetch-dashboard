import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "success" | "warning" | "error" | "accent" | "auto";
  showValue?: boolean;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  size = "md",
  color = "auto",
  showValue = false,
  className,
}: ProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  // Auto color based on percentage
  const getAutoColor = () => {
    if (percentage >= 90) return "bg-gradient-to-r from-error to-error/80";
    if (percentage >= 70) return "bg-gradient-to-r from-warning to-warning/80";
    return "bg-gradient-to-r from-accent to-primary";
  };

  const colorClass =
    color === "auto"
      ? getAutoColor()
      : color === "success"
      ? "bg-gradient-to-r from-success to-success/80"
      : color === "warning"
      ? "bg-gradient-to-r from-warning to-warning/80"
      : color === "error"
      ? "bg-gradient-to-r from-error to-error/80"
      : color === "accent"
      ? "bg-gradient-to-r from-accent to-primary"
      : "bg-gradient-to-r from-primary to-primary/80";

  const sizeClass = size === "sm" ? "h-1" : size === "lg" ? "h-3" : "h-2";

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full bg-white/10 rounded-full overflow-hidden", sizeClass)} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className="text-xs text-white/50 mt-1">{percentage.toFixed(1)}%</span>
      )}
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: "primary" | "success" | "warning" | "error" | "accent" | "auto";
  className?: string;
  children?: React.ReactNode;
}

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = "auto",
  className,
  children,
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getAutoColor = () => {
    if (percentage >= 90) return "url(#error-gradient)";
    if (percentage >= 70) return "url(#warning-gradient)";
    return "url(#accent-gradient)";
  };

  const strokeColor =
    color === "auto"
      ? getAutoColor()
      : color === "success"
      ? "#10b981"
      : color === "warning"
      ? "#f59e0b"
      : color === "error"
      ? "#ef4444"
      : color === "accent"
      ? "url(#accent-gradient)"
      : "#3b82f6";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="accent-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="warning-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="error-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
