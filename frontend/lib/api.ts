export const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8041").replace(/\/$/, "");

export type PublicUser = { id: number; name: string; avatar: string; bio: string; city: string; role: string };
/** Private view of the signed-in account (from /api/auth/me only). */
export type User = PublicUser & { email: string; balance: number };
export type Photo = {
  id: number; title: string; title_fa: string; description: string; url: string; thumb: string;
  category: string; tags: string[]; price: number; width: number; height: number;
  likes: number; sales: number; featured: boolean; created_at: string; author?: PublicUser;
  liked: boolean; can_download: boolean;
};
export type Mission = {
  id: number; brand: string; brand_logo: string; title: string; title_fa: string; brief: string;
  brief_fa: string; cover: string; reward: number; category: string; deadline: string;
  submissions: number; is_open: boolean;
};
export type Category = { slug: string; en: string; fa: string; icon: string };
export type Purchase = { id: number; amount: number; license: string; created_at: string; photo: Photo };
export type Upload = { url: string; thumb: string; width: number; height: number };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** API messages are "فارسی | English"; show the half that matches the page language. */
function localize(message: string) {
  const [fa, en] = message.split(" | ");
  const lang = typeof document === "undefined" ? "fa" : document.documentElement.lang;
  return (lang === "en" ? en : fa) || message;
}

// The session lives in an httpOnly cookie set by the API, so page scripts never see the token.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { detail?: unknown };
    const msg = typeof detail.detail === "string" ? detail.detail : `Request failed (${res.status})`;
    throw new ApiError(res.status, localize(msg));
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Only our own media paths and https images may reach src/href; javascript:, data: etc. become "". */
export const mediaUrl = (u?: string | null) =>
  !u ? "" : u.startsWith("/media/") ? `${API}${u}` : /^https:\/\//i.test(u) ? u : "";

export const downloadUrl = (photoId: number) => `${API}/api/photos/${photoId}/download`;
