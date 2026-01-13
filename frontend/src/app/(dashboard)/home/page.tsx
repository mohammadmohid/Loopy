"use client";

import { useAuth } from "@/lib/auth-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

 const displayName =
    (user.profile?.firstName || user.profile?.lastName)
      ? [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ")
      : user.email || "User";
  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
        Welcome back, {displayName}!
      </h1>
      <p className="text-neutral-500">
        Here&apos;s what&apos;s happening with your projects today.
      </p>
    </div>
  );
}
