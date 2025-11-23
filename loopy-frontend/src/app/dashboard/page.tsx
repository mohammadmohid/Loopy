"use client";
import { useAuth } from "../../lib/auth-provider";
import { useEffect } from "react";

export default function Dashboard() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [user, loading]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome to your Dashboard</h1>
      <p className="mt-2">Hello, {user.name || user.email}!</p>
    </div>
  );
}
