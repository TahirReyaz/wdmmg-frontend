"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/api/auth";
import { onUnauthorized, tokenStore } from "@/api/client";
import type { AuthResponse, RegisterResponse, User } from "@/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  /** Creates the account; the user then confirms their email with a code. */
  register: (name: string, email: string, password: string) => Promise<RegisterResponse>;
  /** Confirms the emailed code and signs in. */
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const signOut = useCallback(
    (reason?: "expired") => {
      tokenStore.set(null);
      queryClient.clear();
      setUserState(null);
      setStatus("anonymous");
      router.replace(reason ? `/login?reason=${reason}` : "/login");
    },
    [queryClient, router],
  );

  // Restore the session on first load.
  useEffect(() => {
    if (!tokenStore.get()) {
      setStatus("anonymous");
      return;
    }
    authApi
      .me()
      .then((me) => {
        setUserState(me);
        setStatus("authenticated");
      })
      .catch(() => {
        tokenStore.set(null);
        setStatus("anonymous");
      });
  }, []);

  // Expired or revoked token anywhere in the app → back to sign-in.
  useEffect(() => onUnauthorized(() => signOut("expired")), [signOut]);

  const signIn = useCallback((res: AuthResponse) => {
    tokenStore.set(res.token);
    setUserState(res.user);
    setStatus("authenticated");
  }, []);

  const login = useCallback(async (email: string, password: string) => signIn(await authApi.login(email, password)), [signIn]);

  const register = useCallback((name: string, email: string, password: string) => authApi.register(name, email, password), []);

  const verifyEmail = useCallback(async (email: string, code: string) => signIn(await authApi.verifyEmail(email, code)), [signIn]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, verifyEmail, logout: () => signOut(), setUser: setUserState }),
    [status, user, login, register, verifyEmail, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
