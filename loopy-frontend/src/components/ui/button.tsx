"use client";

import React, { forwardRef } from "react";
import { cn, createVariants } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const buttonVariants = createVariants(
  {
    variant: {
      primary: "bg-brand text-background hover:bg-brand/90",
      secondary: "bg-neutral-200 text-foreground hover:bg-neutral-300",
      outline: "bg-transparent border border-neutral-300 hover:bg-neutral-100",
      ghost:
        "hover:bg-neutral-100/50 hover:border-neutral-300 text-neutral-700",
    },
    size: {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    },
  },
  {
    variant: "primary",
    size: "md",
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      asChild,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const base =
      "inline-flex items-center justify-center gap-2 rounded-2xl cursor-pointer border border-transparent font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

    const classes = cn(base, buttonVariants({ variant, size }), className);

    return (
      <Comp
        ref={ref}
        className={classes}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? <span className="animate-pulse">Loading...</span> : children}
      </Comp>
    );
  }
);

Button.displayName = "Button";
