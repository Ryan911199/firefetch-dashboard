"use client";

interface TimeframeSelectorProps {
  selected: "24h" | "7d" | "30d" | "90d";
  onChange: (timeframe: "24h" | "7d" | "30d" | "90d") => void;
  className?: string;
}

export function TimeframeSelector({
  selected,
  onChange,
  className = "",
}: TimeframeSelectorProps) {
  const timeframes = [
    { value: "24h" as const, label: "24 hours" },
    { value: "7d" as const, label: "7 days" },
    { value: "30d" as const, label: "30 days" },
    { value: "90d" as const, label: "90 days" },
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selected === tf.value
              ? "bg-blue-500 text-white"
              : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-blue-500/50"
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
