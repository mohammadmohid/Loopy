"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Check, Eye, EyeOff, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-provider";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

const registerSchema = z.object({
  name: z.string().min(2, { message: "Full Name is required" }),
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Min 8 chars" })
    .regex(/\d/, { message: "Must contain a number" }),
});

type FormData = z.infer<typeof registerSchema>;

export default function RegisterForm({
  userType,
}: {
  userType:
    | "org_admin"
    | "project_manager"
    | "team_lead"
    | "team_member"
    | "personal";
}) {
  const { login } = useAuth();
  const router = useRouter();
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
      const response = await apiRequest<{ user: any }>("/auth/register", {
        method: "POST",
        data: { ...data, userType },
      });

      login(response.user);
      router.push("/dashboard/home");
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 max-w-sm w-full"
    >
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Full Name</label>
          <input
            {...register("name")}
            type="text"
            placeholder="John Doe"
            className="w-full p-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Email</label>
          <input
            {...register("email")}
            type="email"
            placeholder="john@example.com"
            className="w-full p-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="relative">
          <label className="text-sm font-medium mb-1 block">Password</label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              className="w-full p-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute inset-y-0 right-3 flex items-center text-neutral-500 hover:text-neutral-700"
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Visual Password Strength Indicators */}
        {passwordValue.length > 0 && (
          <div className="p-3 bg-neutral-50 rounded-md text-xs space-y-1 border border-neutral-100">
            <div
              className={`flex items-center gap-2 ${
                hasMinLength ? "text-emerald-600" : "text-neutral-500"
              }`}
            >
              {hasMinLength ? <Check size={12} /> : <X size={12} />} 8+
              characters
            </div>
            <div
              className={`flex items-center gap-2 ${
                hasDigit ? "text-emerald-600" : "text-neutral-500"
              }`}
            >
              {hasDigit ? <Check size={12} /> : <X size={12} />} Contains number
            </div>
          </div>
        )}

        {errors.password && (
          <p className="text-red-500 text-xs">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-red-500 text-sm font-medium text-center">
          {serverError}
        </p>
      )}

      <Button
        disabled={isSubmitting}
        loading={isSubmitting}
        type="submit"
        className="w-full mt-2"
      >
        Create Account
      </Button>

      <div className="text-center text-sm text-neutral-600">
        Have an account?{" "}
        <Link
          href="/login"
          className="text-primary hover:underline font-medium"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}
