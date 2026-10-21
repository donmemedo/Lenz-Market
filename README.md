# قاب — Qaab

بازار عکس ایرانی: عکاس‌ها عکس‌هایشان را می‌فروشند، برندها مأموریت تعریف می‌کنند.
An Iranian **Foap-style** photo marketplace — creators sell phone photos, brands crowdsource
through paid missions. Bilingual (فارسی / English, full RTL), light + dark, fully responsive.

```
41_Foap/
├── backend/    FastAPI + SQLModel + SQLite (JWT auth, photos, missions, wallet)
├── frontend/   Next.js 15 (App Router) + Tailwind v4 + Framer Motion
└── docker-compose.yml
```

## اجرای سریع با داکر | Run with Docker

```bash
cp .env.example .env         # optional
docker compose up --build
# اگر Docker Desktop بالا نیست، از دیمن سیستمی استفاده کنید:
# docker --context default compose up --build
```

| سرویس | نشانی |
|---|---|
| وب (Next.js) | http://localhost:3041 |
| API (FastAPI) | http://localhost:8041 |
| مستندات API | http://localhost:8041/docs |

> پورت‌های ۳۰۰۰ و ۸۰۰۰ روی این دستگاه اشغال بودند، بنابراین پروژه روی **3041 / 8041** اجرا می‌شود.

## اجرای دستی | Run locally

```bash
# backend
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload --port 8041 --app-dir .

# frontend
cd frontend && npm install
NEXT_PUBLIC_API_URL=http://localhost:8041 npm run dev -- -p 3041
```

پایگاه داده در اولین اجرا خودش ساخته و با داده‌ی نمونه پر می‌شود (۳۵ عکس، ۶ مأموریت، ۹ عکاس).

## حساب نمایشی | Demo account

فقط در حالت توسعه (`APP_ENV=development` و `QAAB_SEED_DEMO=1`) ساخته می‌شود و در حالت production هرگز وجود ندارد.
Only in development; production never seeds it. Sample creators cannot log in.

```
demo@qaab.ir / demo1234
```

## استقرار امن | Production

```bash
APP_ENV=production                       # HTTPS-only cookie, HSTS, no /docs, no demo data
SECRET_KEY=$(python -c "import secrets;print(secrets.token_urlsafe(48))")
CORS_ORIGINS=https://qaab.ir             # the web origin(s)
NEXT_PUBLIC_API_URL=https://api.qaab.ir  # must share the site with the web origin (SameSite cookie)
FORWARDED_ALLOW_IPS=<reverse proxy IP>   # so per-IP rate limits see real clients
```

`docker-compose.yml` defaults to development for local use, so set `APP_ENV=production` on a server.
Run the API behind an HTTPS reverse proxy. Details and the full audit: [SECURITY_AUDIT.md](SECURITY_AUDIT.md).

## آزمون‌های امنیتی | Security tests

```bash
cd backend && .venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q -p no:cacheprovider tests
```

## امکانات | Features

- **صفحه اصلی**: هیرو با پارالاکس، آمار زنده، دسته‌بندی‌ها، قاب‌های برگزیده (چیدمان مِیسونری)، مأموریت‌ها، پرسش‌های پرتکرار
- **بازار**: جستجو، فیلتر دسته‌بندی، مرتب‌سازی (پرطرفدار/تازه/پرفروش/قیمت)
- **صفحه عکس**: انتخاب مجوز (استاندارد / نامحدود تجاری)، خرید، پسندیدن، قاب‌های مشابه
- **مأموریت برندها**: خلاصه، جایزه، مهلت، ارسال‌ها
- **حساب کاربری**: ورود/ثبت‌نام با نشست امن (کوکی httpOnly)، پیش‌خوان با کیف پول و آمار فروش، بارگذاری عکس
- **پوسته روشن/تیره** با انیمیشن، **دوزبانه fa/en** با RTL کامل، ریسپانسیو از موبایل تا دسکتاپ

نگارش فارسی رابط کاربری بر پایه‌ی
[فهرست معادل‌های فارسی در UX Writing](https://github.com/Aylarrazzaghi/Persian-vocabulary-in-UXwriting)
انتخاب شده است (حساب کاربری، پیش‌خوان، کیف پول، بارگیری، مبلغ/قیمت، دیدگاه، …).

## API

`GET /api/photos` · `GET /api/photos/{id}` · `POST /api/photos` · `POST /api/photos/{id}/like`
`POST /api/photos/{id}/buy` · `GET /api/missions` · `GET /api/missions/{id}/photos`
`GET /api/creators` · `POST /api/auth/register|login` · `GET /api/auth/me` · `GET /api/me/earnings`
`POST /api/upload` · `GET /api/stats` · `GET /api/categories`

## مرحله بعد | Roadmap

1. **PWA**: مانیفست و آیکن آماده است (`public/manifest.webmanifest`) — گام بعد افزودن service worker و حالت آفلاین
2. **APK / IPA**: بسته‌بندی با Capacitor روی همین فرانت‌اند
3. درگاه پرداخت ایرانی، تسویه‌حساب خودکار، داوری مأموریت‌ها
