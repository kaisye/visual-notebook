"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-accent text-accent-foreground hover:bg-muted disabled:opacity-50",
  ghost: "hover:bg-accent text-foreground disabled:opacity-50",
  outline:
    "border border-border bg-transparent hover:bg-accent text-foreground disabled:opacity-50",
  danger: "bg-danger text-white hover:opacity-90 disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  icon: "h-8 w-8 justify-center",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-[var(--radius)] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
