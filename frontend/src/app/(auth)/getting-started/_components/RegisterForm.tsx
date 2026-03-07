"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Check, Eye, EyeOff, X, Camera } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-provider";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import Image from "next/image";

const registerSchema = z.object({
  firstName: z.string().min(2, { message: "First Name is required" }),
  lastName: z.string().min(2, { message: "Last Name is required" }),
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Min 8 chars" })
    .regex(/\d/, { message: "Must contain a number" }),
});

type FormData = z.infer<typeof registerSchema>;

export default function RegisterForm({
  userType,
  inviteToken,
  inviteEmail,
}: {
  userType?: any;
  inviteToken?: string;
  inviteEmail?: string;
}) {
  const { login } = useAuth();
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        // 2MB Limit
        alert("Image must be smaller than 2MB");
        return;
      }
      setAvatar(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      let avatarKey = "";

      // 1. Upload Avatar if selected
      if (avatar) {
        const signRes = await apiRequest<{ signedUrl: string; key: string }>(
          "/auth/upload/avatar/sign",
          {
            method: "POST",
            data: { fileType: avatar.type },
          }
        );

        await fetch(signRes.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": avatar.type },
          body: avatar,
        });

        avatarKey = signRes.key;
      }

      // 2. Register User
      const response = await apiRequest<{
        success: boolean;
        needsOTP?: boolean;
        user?: any;
        userId?: string;
        email?: string;
      }>("/auth/register", {
        method: "POST",
        data: { ...data, userType, avatarKey },
      });

      if (response.success) {
        if (response.needsOTP && response.userId && response.email) {
          // Store invite token in session if present
          if (inviteToken) {
            sessionStorage.setItem("pendingInviteToken", inviteToken);
          }
          router.push(
            `/verify-otp?userId=${response.userId}&email=${encodeURIComponent(response.email)}`
          );
        } else if (response.user) {
          login(response.user);
          router.push("/home");
        }
      }
    } catch (err: any) {
      setServerError(err.message || "Registration failed");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 max-w-sm w-full"
    >
      {/* Avatar Upload */}
      <div className="flex justify-center mb-2">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center cursor-pointer border-2 border-dashed border-neutral-300 hover:border-primary overflow-hidden relative group"
        >
          {avatar ? (
            <Image
              src={URL.createObjectURL(avatar)}
              alt="Avatar"
              className="w-full h-full object-cover"
              width={80}
              height={80}
            />
          ) : (
            <Camera className="w-8 h-8 text-neutral-400 group-hover:text-primary" />
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div className="flex gap-1">
          <div>
            <label className="text-sm font-medium mb-1 block">First Name</label>
            <input
              {...register("firstName")}
              type="text"
              className="w-full p-2 border rounded-md"
              placeholder="John"
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Last Name</label>
            <input
              {...register("lastName")}
              type="text"
              className="w-full p-2 border rounded-md"
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-1">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Email</label>
          <input
            {...register("email")}
            type="email"
            className="w-full p-2 border rounded-md"
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="relative">
          <label className="text-sm font-medium mb-1 block">Password</label>
          <input
            {...register("password")}
            type={showPass ? "text" : "password"}
            className="w-full p-2 border rounded-md"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-8 text-neutral-500"
          >
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Password Strength */}
        {passwordValue.length > 0 && (
          <div className="p-3 bg-neutral-50 rounded-md text-xs space-y-1">
            <div
              className={`flex items-center gap-2 ${
                hasMinLength ? "text-emerald-600" : "text-neutral-500"
              }`}
            >
              {hasMinLength ? <Check size={12} /> : <X size={12} />} 8+ chars
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
