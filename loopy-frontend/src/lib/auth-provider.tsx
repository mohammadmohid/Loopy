"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
  // Add more fields as needed
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const storedToken = localStorage.getItem("jwt");
      const storedUser = localStorage.getItem("user");
      return {
        user: storedUser ? JSON.parse(storedUser) : null,
        token: storedToken || null,
        loading: false,
      };
    } catch {
      // If localStorage is unavailable or parsing fails, fall back to defaults
      return { user: null, token: null, loading: false };
    }
  });

  const login = (jwt: string, userObj: User) => {
    setAuth({ user: userObj, token: jwt, loading: false });
    localStorage.setItem("jwt", jwt);
    localStorage.setItem("user", JSON.stringify(userObj));
  };

  const logout = () => {
    setAuth({ user: null, token: null, loading: false });
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
