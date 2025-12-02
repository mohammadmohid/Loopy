"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-provider";
import { apiRequest } from "@/lib/api";
import { useState } from "react";

export default function SettingsPage() {
  const { user, login } = useAuth();
  const [message, setMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      firstName: user?.profile.firstName,
      lastName: user?.profile.lastName,
      email: user?.email,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const response = await apiRequest<{ user: any }>("/auth/me", {
        method: "PUT",
        data,
      });
      login(response.user);
      setMessage("Profile updated successfully!");
    } catch (error) {
      setMessage("Failed to update profile.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-neutral-500">Manage your account preferences</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                First Name
              </label>
              <input
                {...register("firstName")}
                className="w-full p-2 border border-neutral-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Last Name
              </label>
              <input
                {...register("lastName")}
                className="w-full p-2 border border-neutral-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Email
            </label>
            <input
              {...register("email")}
              className="w-full p-2 border border-neutral-200 rounded-lg text-sm"
            />
          </div>

          {message && (
            <p className="text-sm text-emerald-600 font-medium">{message}</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
