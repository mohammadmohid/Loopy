"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/api";

const loginSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    try {
      const response = await apiRequest<{ user: any }>("/auth/login", {
        method: "POST",
        data: data,
      });

      login(response.user);
      router.push("/home");
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 w-full max-w-sm"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <input
          {...register("email")}
          type="email"
          className="w-full p-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {errors.email && (
          <p className="text-red-500 text-xs">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2 relative">
        <label className="text-sm font-medium">Password</label>
        <input
          {...register("password")}
          type={showPass ? "text" : "password"}
          className="w-full p-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => setShowPass(!showPass)}
          className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
        >
          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        {errors.password && (
          <p className="text-red-500 text-xs">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-red-500 text-sm text-center">{serverError}</p>
      )}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Sign In
      </Button>

      <div className="text-center text-sm text-neutral-600">
        Don&apos;t have an account?{" "}
        <Link
          href="/getting-started"
          className="text-primary hover:underline font-medium"
        >
          Sign up
        </Link>
      </div>
    </form>
  );
}
