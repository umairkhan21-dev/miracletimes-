"use client";

import { ApiError } from "@/lib/api";
import { adminLogin, adminLogout, adminMe } from "@/lib/admin/api";
import type { AdminUser } from "@/lib/admin/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: AdminUser };

type AdminAuthContextValue = {
  status: AuthState["status"];
  user: AdminUser | null;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });

  const refresh = useCallback(async () => {
    try {
      const user = await adminMe();
      if (user.role !== "admin" || !user.isActive) {
        await adminLogout().catch(() => undefined);
        setState({ status: "anonymous", user: null });
        return;
      }
      setState({ status: "authenticated", user });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setState({ status: "anonymous", user: null });
        return;
      }
      setState({ status: "anonymous", user: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await adminLogin(email, password);
    if (result.user.role !== "admin" || !result.user.isActive) {
      await adminLogout().catch(() => undefined);
      throw new ApiError(
        "Only active administrator accounts can access this panel.",
        403,
        "FORBIDDEN",
      );
    }
    // Session is the HttpOnly cookie set by the API — never store a JWT in JS.
    setState({ status: "authenticated", user: result.user });
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } finally {
      setState({ status: "anonymous", user: null });
    }
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      isAdmin: state.status === "authenticated" && state.user?.role === "admin",
      refresh,
      login,
      logout,
    }),
    [state, refresh, login, logout],
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}
