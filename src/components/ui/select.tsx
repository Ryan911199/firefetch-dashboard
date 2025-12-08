"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  value: string | number;
  onValueChange: (value: string | number) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
}

export function Select({ value, onValueChange, options, disabled = false, className }: SelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => {
          const option = options.find((opt) => String(opt.value) === e.target.value);
          if (option) {
            onValueChange(option.value);
          }
        }}
        disabled={disabled}
        className={cn(
          "w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-10 text-sm text-text-primary transition-colors",
          "hover:border-border/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
    </div>
  );
}
