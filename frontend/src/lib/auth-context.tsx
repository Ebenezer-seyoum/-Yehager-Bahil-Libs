"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { signIn } from "next-auth/react";

type AuthErrorType = "auth_required" | "user_not_registered" | "unknown";

type AuthError = {
  type: AuthErrorType;
  message: string;
};

type AuthContextValue = {
  user: unknown | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError | null;
  navigateToLogin: () => void;
  logout: () => void;
  checkAppState: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<unknown | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/backend/session", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok || payload.status !== "authenticated") {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: payload.status === "auth_required" ? "auth_required" : "unknown",
          message: payload.message ?? "Authentication required",
        });
        return;
      }

      setUser(payload.profile ?? payload.authUser ?? null);
      setIsAuthenticated(true);

      await fetch("/api/backend/users/sync", { method: "POST" });
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: "unknown",
        message: error instanceof Error ? error.message : "Unexpected auth error",
      });
    } finally {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkAppState();
  }, [checkAppState]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const markOnline = () => {
      void fetch("/api/backend/users/me/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online: true }),
        keepalive: true,
      }).catch(() => undefined);
    };
    const markOffline = () => {
      void fetch("/api/backend/users/me/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online: false }),
        keepalive: true,
      }).catch(() => undefined);
    };

    markOnline();
    const interval = window.setInterval(markOnline, 60_000);
    window.addEventListener("pagehide", markOffline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", markOffline);
    };
  }, [isAuthenticated]);

  const navigateToLogin = useCallback(() => {
    void signIn(undefined, { callbackUrl: window.location.href });
  }, []);

  const logout = useCallback(() => {
    void fetch("/api/backend/users/me/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online: false }),
      keepalive: true,
    }).catch(() => undefined);
    window.location.href = "/api/auth/logout";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        navigateToLogin,
        logout,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
