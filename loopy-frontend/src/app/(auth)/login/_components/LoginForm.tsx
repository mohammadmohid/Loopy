"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LogIn, X } from "lucide-react";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [isShowPass, setIsShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fake delay for now
  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const pass = formData.get("password") as string;

    // TODO: SEND TO SERVER
    await delay(2000);
    setLoading(false);
    setError("Unexpected error occured.");
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
            className="absolute inset-y-0 right-4 flex items-center text-text-500 hover:text-text-700"
          >
            {isShowPass ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-500 font-medium text-sm">
          Error: <span className="text-text-600 font-normal">{error}</span>
        </p>
      )}

      <Button loading={loading} type="submit">
        <LogIn />
        Sign In
      </Button>

      <div className="flex justify-between">
        <span className="self-center text-sm">
          Don&apos;t have an account?
          <Link className="mx-1 hover:underline" href="/getting-started">
            Sign Up.
          </Link>
        </span>
        <Link className="hover:underline text-sm" href="/forgot-password">
          Forgot Password?
        </Link>
      </div>
    </form>
  );
}
