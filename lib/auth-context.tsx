"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { APP_CONFIG } from "./config";
import { clearSession, getAccessToken, setSession } from "./auth";

type AuthUser = {
  email?: string;
  phone?: string;
  scope?: "PARTNER" | "INSTITUTION";
  permissions?: {
    role?: string;
    canViewTransactions?: boolean;
    canManageMembers?: boolean;
    canManageInstitution?: boolean;
    canRequestLiquidation?: boolean;
  };
  institution?: {
    id?: string;
    code?: string;
    name?: string;
  };
  partner?: {
    id?: string;
    partnerName?: string;
    partnerType?: string;
  };
};

type AuthContextType = {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (data: { accessToken: string; refreshToken?: string; user?: AuthUser }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = localStorage.getItem(APP_CONFIG.storageKeys.user);
    setAccessToken(token);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        setUser(null);
      }
    }
    setIsHydrated(true);
  }, []);

  function login(data: { accessToken: string; refreshToken?: string; user?: AuthUser }) {
    setSession(data);
    setAccessToken(data.accessToken);
    setUser(data.user || null);
  }

  function logout() {
    clearSession();
    setAccessToken(null);
    setUser(null);
  }

  const value = useMemo<AuthContextType>(
    () => ({
      accessToken,
      user,
      isAuthenticated: Boolean(accessToken),
      isHydrated,
      login,
      logout,
    }),
    [accessToken, user, isHydrated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
