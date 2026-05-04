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

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Get icon name for mime type
 */
export function getMimeTypeIcon(mimeType: string): {
  icon: "image" | "pdf" | "document" | "audio" | "video" | "json" | "code" | "file";
  color?: string;
} {
  if (mimeType.startsWith("image/")) {
    return { icon: "image", color: "text-blue-500" };
  }
  if (mimeType.includes("pdf")) {
    return { icon: "pdf", color: "text-red-500" };
  }
  if (mimeType.includes("word") || mimeType.includes("officedocument.wordprocessingml")) {
    return { icon: "document", color: "text-blue-500" };
  }
  if (mimeType.startsWith("audio/")) {
    return { icon: "audio", color: "text-purple-500" };
  }
  if (mimeType.startsWith("video/")) {
    return { icon: "video", color: "text-orange-500" };
  }
  if (mimeType.includes("json")) {
    return { icon: "json", color: "text-yellow-500" };
  }
  if (mimeType.includes("text") || mimeType.includes("code")) {
    return { icon: "code", color: "text-gray-500" };
  }
  return { icon: "file", color: "text-neutral-400" };
}

/**
 * Check if file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType.includes("pdf");
}

/**
 * Check if file is a DOCX
 */
export function isDocxFile(mimeType: string): boolean {
  return (
    mimeType.includes("word") ||
    mimeType.includes("officedocument.wordprocessingml")
  );
}

