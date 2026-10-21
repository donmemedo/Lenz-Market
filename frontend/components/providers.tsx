"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, UNAUTHORIZED_EVENT, type User } from "@/lib/api";

type AuthCtx = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try { setUser(await api<User>("/api/auth/me")); }
    catch { setUser(null); }
    finally { setReady(true); }
  }, []);

  useEffect(() => {
    void refresh();
    // A session can end elsewhere (logout on another device, expiry): drop it here too.
    const drop = () => setUser(null);
    const recheck = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener(UNAUTHORIZED_EVENT, drop);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, drop);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [refresh]);

  const value = useMemo<AuthCtx>(() => {
    const start = async (path: string, body: object) => {
      setUser((await api<{ user: User }>(path, { method: "POST", body: JSON.stringify(body) })).user);
    };
    return {
      user, ready, refresh,
      login: (email, password) => start("/api/auth/login", { email, password }),
      register: (name, email, password) => start("/api/auth/register", { name, email, password }),
      logout: async () => {
        await api("/api/auth/logout", { method: "POST" }).catch(() => {});
        setUser(null);
      },
    };
  }, [user, ready, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
      {/* reducedMotion="user": transforms are skipped for people who ask the OS for less motion. */}
      <MotionConfig reducedMotion="user">
        <AuthProvider>{children}</AuthProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
