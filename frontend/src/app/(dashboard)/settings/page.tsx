"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-provider";
import { apiRequest } from "@/lib/api";
import { useState, useRef } from "react";
import { Loader2, Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, login, logout } = useAuth();
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { isSubmitting: isProfileSubmitting },
  } = useForm({
    defaultValues: {
      firstName: user?.profile.firstName,
      lastName: user?.profile.lastName,
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { isSubmitting: isPasswordSubmitting },
    reset: resetPasswordForm,
  } = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data: any) => {
    try {
      setProfileMessage("");
      const response = await apiRequest<{ user: any }>("/auth/me", {
        method: "PUT",
        data,
      });
      login(response.user);
      setProfileMessage("Profile updated successfully!");
    } catch (error) {
      setProfileMessage("Failed to update profile.");
    }
  };

  const onPasswordSubmit = async (data: any) => {
    try {
      setPasswordMessage("");
      setPasswordError("");
      
      if (data.newPassword !== data.confirmPassword) {
        setPasswordError("New passwords do not match.");
        return;
      }
      
      if (data.newPassword.length < 8) {
        setPasswordError("New password must be at least 8 characters long.");
        return;
      }

      await apiRequest("/auth/password", {
        method: "PUT",
        data: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
      });
      
      setPasswordMessage("Password updated successfully!");
      resetPasswordForm();
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || "Failed to update password.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    
    try {
      setIsDeleting(true);
      await apiRequest("/auth/me", {
        method: "DELETE",
      });
      logout();
    } catch (error) {
      console.error("Failed to delete account", error);
      alert("Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setProfileMessage("");
      
      // Get presigned URL
      const { signedUrl, key } = await apiRequest<{ signedUrl: string; key: string }>(
        "/auth/upload/avatar/sign",
        {
          method: "POST",
          data: {
            fileName: file.name,
            fileType: file.type,
          },
        }
      );

      // Upload directly to S3/R2
      await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      // Update user profile with new avatarKey
      const response = await apiRequest<{ user: any }>("/auth/me", {
        method: "PUT",
        data: {
          avatarKey: key,
        },
      });

      login(response.user);
      setProfileMessage("Avatar updated successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      setProfileMessage("Failed to upload avatar.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-500">Manage your account preferences and security.</p>
      </div>

      {/* Profile Information */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-6 text-neutral-900">Personal Information</h2>
        
        <div className="mb-6 flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <div className="w-20 h-20 rounded-full bg-neutral-100 border-2 border-neutral-200 overflow-hidden flex items-center justify-center">
              {user?.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-neutral-400">
                  {user?.profile?.firstName?.[0]?.toUpperCase() || "U"}
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium text-neutral-900">Profile Picture</h3>
            <p className="text-xs text-neutral-500 mt-1">Click to upload a new avatar</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                First Name
              </label>
              <input
                {...registerProfile("firstName", { required: true })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Last Name
              </label>
              <input
                {...registerProfile("lastName", { required: true })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Email
            </label>
            <input
              value={user?.email || ""}
              disabled
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm bg-neutral-50 text-neutral-500 cursor-not-allowed"
            />
            <p className="text-xs text-neutral-400 mt-1">Email address cannot be changed.</p>
          </div>

          {profileMessage && (
            <p className={cn("text-sm font-medium", profileMessage.includes("Failed") ? "text-red-600" : "text-emerald-600")}>
              {profileMessage}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isProfileSubmitting || isUploading}>
              {isProfileSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Profile
            </Button>
          </div>
        </form>
      </div>

      {/* Security */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-6 text-neutral-900">Security</h2>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              {...registerPassword("currentPassword", { required: true })}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              {...registerPassword("newPassword", { required: true })}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              {...registerPassword("confirmPassword", { required: true })}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-red-600 font-medium">{passwordError}</p>
          )}
          {passwordMessage && (
            <p className="text-sm text-emerald-600 font-medium">{passwordMessage}</p>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-2 text-red-600">Danger Zone</h2>
        <p className="text-sm text-neutral-500 mb-6">
          Deleting your account is permanent. This action cannot be undone. However, your data like tasks you were assigned to will remain in the workspace.
        </p>
        
        <Button 
          variant="destructive" 
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="gap-2"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete Account
        </Button>
      </div>
    </div>
  );
}

// Ensure cn utility is available
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
