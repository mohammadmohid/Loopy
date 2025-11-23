"use client";

import { Button } from "@/components/ui/button";
import { Check, Eye, EyeOff, X } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useState } from "react";

type RegisterFormProps = {
  userType: "organization_admin" | "personal" | "team_member";
  organizationEmail?: string | null;
};

export default function RegisterForm({
  userType,
  organizationEmail,
}: RegisterFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isShowPass, setIsShowPass] = useState(false);
  const [password, setPassword] = useState("");

  const hasMinLength = password.length >= 8;
  const hasDigit = /\d/.test(password);
  const passCorrect = hasDigit && hasMinLength;
  const showPasswordChecker = password.length > 0;

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const pass = formData.get("password") as string;

    try {
      // TODO: Replace with actual backend endpoint
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: pass,
          userType,
          organizationEmail,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
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
            value={password}
            onChange={handlePasswordChange}
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
        {showPasswordChecker && (
          <div className="mt-2 p-3 bg-text-100 rounded-md bg-card border border-text-200 text-sm space-y-2 animate-in fade-in slide-in-from-top-2">
            <p className="font-medium text-neutral-600">
              Password must contain:
            </p>
            <ul className="space-y-1">
              <li
                className={`flex items-center gap-2 ${
                  hasMinLength ? "text-green-600" : "text-red-500"
                }`}
              >
                {hasMinLength ? <Check /> : <X />} At least 8 characters
              </li>
              <li
                className={`flex items-center gap-2 ${
                  hasDigit ? "text-green-600" : "text-red-500"
                }`}
              >
                {hasMinLength ? <Check /> : <X />} At least 1 digit
              </li>
            </ul>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 font-medium text-sm">
          Error: <span className="text-neutral-600 font-normal">{error}</span>
        </p>
      )}

      <Button
        disabled={loading || !passCorrect}
        loading={loading}
        type="submit"
      >
        Create an account
      </Button>

      <span className="self-center text-sm">
        Have an account?
        <Link className="mx-1 hover:underline text-primary" href="/login">
          Sign in instead.
        </Link>
      </span>
    </form>
  );
}
