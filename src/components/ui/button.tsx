"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Variants
          variant === "primary" && "bg-primary text-white hover:bg-primary-hover focus-visible:outline-primary",
          variant === "secondary" && "bg-surface text-text-primary hover:bg-border focus-visible:outline-border",
          variant === "outline" && "border border-border bg-transparent text-text-primary hover:bg-border/50 focus-visible:outline-border",
          variant === "ghost" && "bg-transparent text-text-secondary hover:bg-border/50 hover:text-text-primary focus-visible:outline-border",
          variant === "danger" && "bg-error text-white hover:bg-error/90 focus-visible:outline-error",
          // Sizes
          size === "sm" && "h-8 px-3 text-xs",
          size === "md" && "h-10 px-4 text-sm",
          size === "lg" && "h-12 px-6 text-base",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
