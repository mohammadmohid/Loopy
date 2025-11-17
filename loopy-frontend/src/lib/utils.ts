import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Variant Engine

type VariantConfig = Record<string, Record<string, string>>;
type VariantDefaults = Record<string, string>;

export function createVariants(
  config: VariantConfig,
  defaults: VariantDefaults = {}
) {
  return (options: Record<string, string> = {}) => {
    const classes: string[] = [];

    for (const key in config) {
      const value = options[key] ?? defaults[key];
      if (!value) continue;

      const variantClass = config[key][value];
      if (variantClass) classes.push(variantClass);
    }

    return classes.join(" ");
  };
}
