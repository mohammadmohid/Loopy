"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LogIn, X } from "lucide-react";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [isShowPass, setIsShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // JWT login integration
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const pass = formData.get("password") as string;

    try {
      // TODO: Replace with actual backend endpoint
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
      const data = await res.json();
      // Expect { token: string, user: object }
      localStorage.setItem("jwt", data.token);
      // TODO: update global auth state here
      setLoading(false);
      // Optionally redirect or show success
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Unexpected error occured.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2 flex flex-col">
        <input
          name="email"
          type="email"
          required
          placeholder="Enter email address"
        />
        <div className="relative">
          <input
            name="password"
            type={isShowPass ? "text" : "password"}
            required
            className="w-full"
            placeholder="Enter password"
          />
          <button
            type="button"
            onClick={() => setIsShowPass(!isShowPass)}
            className="absolute inset-y-0 right-4 flex items-center cursor-pointer text-neutral-500 hover:text-neutral-700"
          >
            {isShowPass ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-500 font-medium text-sm">
          Error: <span className="text-neutral-600 font-normal">{error}</span>
        </p>
      )}

      <Button loading={loading} type="submit">
        <LogIn />
        Sign In
      </Button>

      <div className="flex text-sm justify-between">
        <span className="self-center">
          Don&apos;t have an account?
          <Link
            className="mx-1 hover:underline font-medium text-primary"
            href="/getting-started"
          >
            Sign Up.
          </Link>
        </span>
        <Link className="hover:underline text-primary" href="/forgot-password">
          Forgot Password?
        </Link>
      </div>
    </form>
  );
}
