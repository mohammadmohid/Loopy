import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createVariants<
  Variants extends Record<string, Record<string, string>>,
  DefaultVariants extends { [K in keyof Variants]?: keyof Variants[K] }
>(variants: Variants, defaultVariants: DefaultVariants) {
  return function (opts?: {
    [K in keyof Variants]?: keyof Exclude<Variants[K], undefined>;
  }) {
    const classNames: string[] = [];

    for (const key in variants) {
      if (Object.prototype.hasOwnProperty.call(variants, key)) {
        const variantKey = opts?.[key] ?? defaultVariants[key];
        if (variantKey) {
          classNames.push(variants[key][variantKey as keyof (typeof variants)[typeof key]]);
        }
      }
    }

    return classNames.join(" ");
  };
}
