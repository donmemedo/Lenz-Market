export const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8041").replace(/\/$/, "");

export type PublicUser = { id: number; name: string; avatar: string; bio: string; city: string; role: string };
/** Private view of the signed-in account (from /api/auth/me only). */
export type User = PublicUser & { email: string; balance: number };
export type Photo = {
  id: number; title: string; title_fa: string; description: string; url: string; thumb: string;
  category: string; tags: string[]; price: number; width: number; height: number;
  likes: number; sales: number; featured: boolean; created_at: string; author?: PublicUser;
  liked: boolean; can_download: boolean; licenses: string[];
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

/** Fired on any 401 so the app drops a session that expired or was revoked elsewhere. */
export const UNAUTHORIZED_EVENT = "qaab:unauthorized";

async function toError(res: Response) {
  if (res.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  const { detail } = (await res.json().catch(() => ({}))) as { detail?: unknown };
  const msg = typeof detail === "string" ? detail
    : res.status === 422 ? "برخی از اطلاعات واردشده معتبر نیست | Some fields are invalid"
    : "خطایی رخ داد؛ دوباره امتحان کنید | Something went wrong, please try again";
  return new ApiError(res.status, localize(msg));
}

const offline = () => new ApiError(0, localize("ارتباط با سرور برقرار نشد | Can't reach the server"));

// The session lives in an httpOnly cookie set by the API, so page scripts never see the token.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: typeof init.body === "string" ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
  }).catch(() => { throw offline(); });
  if (!res.ok) throw await toError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Only our own media paths and https images may reach src/href; javascript:, data: etc. become "". */
export const mediaUrl = (u?: string | null) =>
  !u ? "" : u.startsWith("/media/") ? `${API}${u}` : /^https:\/\//i.test(u) ? u : "";

export const downloadUrl = (photoId: number) => `${API}/api/photos/${photoId}/download`;

/** Save the original through the session cookie, showing API errors in the page instead of a raw JSON page. */
export async function downloadPhoto(photoId: number) {
  let res: Response;
  try {
    res = await fetch(downloadUrl(photoId), { credentials: "include" });
  } catch {
    window.location.href = downloadUrl(photoId); // demo photos redirect to their image host
    return;
  }
  if (!res.ok) throw await toError(res);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await res.blob());
  a.download = `qaab-${photoId}.jpg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** Login link that brings the user back; `next` is only ever a same-site path. */
export const loginPath = (locale: string, next?: string) =>
  `/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
export function safeNext(next: string | null) {
  // Resolve instead of prefix-matching: browsers drop tabs/newlines, so "/\t/evil.example" would become "//evil.example".
  if (!next || !next.startsWith("/") || /[\u0000-\u001F\\]/.test(next)) return null;
  try {
    const u = new URL(next, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search + u.hash : null;
  } catch { return null; }
}
