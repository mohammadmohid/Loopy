"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiRequest } from "./api";

interface UserProfile {
  firstName: string;
  lastName: string;
  avatarKey?: string;
  avatarUrl?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profile: UserProfile;
  globalRole: "ADMIN" | "USER";
  isEmailConfirmed?: boolean;
  activeWorkspace?: string;
  workspaceName?: string;
  workspaceRole?: "ADMIN" | "PROJECT_MANAGER" | "MEMBER";
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = [
  "/login",
  "/getting-started",
  "/",
  "/verify-otp",
  "/create-workspace",
  "/join",
  "/confirm-email",
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { user } = await apiRequest<{ user: User }>("/auth/me");
        setUser(user);

        // If user has no workspace and is not on workspace creation page, redirect
        if (
          user &&
          user.isEmailConfirmed &&
          !user.activeWorkspace &&
          !PUBLIC_PATHS.includes(pathname)
        ) {
          router.push("/create-workspace");
        }
      } catch (error) {
        console.log("No active session found");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!isLoading && !user && !PUBLIC_PATHS.includes(pathname)) {
      router.push("/login");
    }
  }, [user, isLoading, router, pathname]);

  const login = (newUser: User) => {
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
