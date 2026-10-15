"use client";

import { ThemeProvider } from "next-themes";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken, type User } from "@/lib/api";

type AuthCtx = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setReady(true); return; }
    try { setUser(await api<User>("/api/auth/me")); }
    catch { setToken(null); setUser(null); }
    finally { setReady(true); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handle = async (path: string, body: object) => {
    const res = await api<{ token: string; user: User }>(path, { method: "POST", body: JSON.stringify(body) });
    setToken(res.token);
    setUser(res.user);
  };

  const value = useMemo<AuthCtx>(() => ({
    user, ready, refresh,
    login: (email, password) => handle("/api/auth/login", { email, password }),
    register: (name, email, password) => handle("/api/auth/register", { name, email, password }),
    logout: () => { setToken(null); setUser(null); },
  }), [user, ready, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
