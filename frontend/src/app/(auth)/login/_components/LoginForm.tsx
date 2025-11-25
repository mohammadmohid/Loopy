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

const loginSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Min 8 chars" })
    .regex(/\d/, { message: "Must contain a number" }),
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data }),
        }
      );

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || "Login failed");
      }

      login(responseData.token, responseData.user);
      router.push("/dashboard");
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-2 w-full max-w-sm"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <input
          {...register("email")}
          type="email"
          required
          className="w-full p-2 border rounded-md"
        />
      </div>

      <div className="space-y-2 relative">
        <label className="text-sm font-medium">Password</label>
        <input
          {...register("password")}
          type={showPass ? "text" : "password"}
          required
          className="w-full p-2 border rounded-md"
        />
        <button
          type="button"
          onClick={() => setShowPass(!showPass)}
          className="absolute right-3 top-8 text-gray-500 hover:cursor-pointer"
        >
          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Sign In
      </Button>

      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/getting-started" className="text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </form>
  );
}
