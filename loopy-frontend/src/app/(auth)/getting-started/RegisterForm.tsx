"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Check, Eye, EyeOff, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-provider";

// Validation Schema
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Min 8 chars")
    .regex(/\d/, "Must contain a number"),
});

type FormData = z.infer<typeof registerSchema>;

export default function RegisterForm({ userType, organizationEmail }: any) {
  const { login } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch("password", "");
  const hasMinLength = passwordValue.length >= 8;
  const hasDigit = /\d/.test(passwordValue);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, userType, organizationEmail }),
        }
      );

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.message);

      // Use AuthProvider to manage session state
      login(responseData.token, responseData.user);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="space-y-2">
        <input
          {...register("email")}
          type="email"
          placeholder="Enter email address"
          className="w-full p-2 border rounded"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}

        <div className="relative">
          <input
            {...register("password")}
            type={showPass ? "text" : "password"}
            placeholder="Enter password"
            className="w-full p-2 border rounded"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute inset-y-0 right-4 flex items-center text-neutral-500"
          >
            {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Visual Password Strength Indicators */}
        {passwordValue.length > 0 && (
          <div className="p-3 bg-neutral-50 rounded text-sm space-y-1">
            <div
              className={`flex items-center gap-2 ${
                hasMinLength ? "text-green-600" : "text-neutral-500"
              }`}
            >
              {hasMinLength ? <Check size={14} /> : <X size={14} />} 8+
              characters
            </div>
            <div
              className={`flex items-center gap-2 ${
                hasDigit ? "text-green-600" : "text-neutral-500"
              }`}
            >
              {hasDigit ? <Check size={14} /> : <X size={14} />} Contains number
            </div>
          </div>
        )}

        {errors.password && (
          <p className="text-red-500 text-sm">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-red-500 text-sm font-medium">{serverError}</p>
      )}

      <Button disabled={isSubmitting} loading={isSubmitting} type="submit">
        Create an account
      </Button>

      <span className="self-center text-sm">
        Have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </span>
    </form>
  );
}
