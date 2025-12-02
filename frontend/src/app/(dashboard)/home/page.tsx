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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
        Welcome back, {user.firstName + " " + user.lastName || user.email}!
      </h1>
      <p className="text-neutral-500">
        Here&apos;s what&apos;s happening with your projects today.
      </p>
    </div>
  );
}
