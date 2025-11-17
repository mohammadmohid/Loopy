"use client";

import React, { forwardRef } from "react";
import { cn, createVariants } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const buttonVariants = createVariants(
  {
    variant: {
      primary: "bg-brand text-white hover:bg-brand/90",
      secondary: "bg-gray-200 text-black hover:bg-gray-300",
      outline: "border border-gray-300 hover:bg-gray-100",
      ghost: "hover:bg-gray-100 text-gray-700",
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
      "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

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
