export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8041";

export type User = { id: number; name: string; email: string; avatar: string; bio: string; city: string; role: string; balance: number };
export type Photo = {
  id: number; title: string; title_fa: string; description: string; url: string; thumb: string;
  category: string; tags: string[]; price: number; width: number; height: number;
  likes: number; sales: number; featured: boolean; created_at: string; author?: User; liked: boolean;
};
export type Mission = {
  id: number; brand: string; brand_logo: string; title: string; title_fa: string; brief: string;
  brief_fa: string; cover: string; reward: number; category: string; deadline: string;
  submissions: number; is_open: boolean;
};
export type Category = { slug: string; en: string; fa: string; icon: string };
export type Purchase = { id: number; amount: number; license: string; created_at: string; photo: Photo };

const TOKEN_KEY = "qaab_token";
export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (t: string | null) => {
  if (typeof window === "undefined") return;
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { detail?: string }).detail || `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const mediaUrl = (u: string) => (u.startsWith("/") ? `${API}${u}` : u);
