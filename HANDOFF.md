# HANDOFF — security, performance and UX hardening

Branch `security/red-blue-audit-hardening`. Full findings, attack tree and numbers: [SECURITY_AUDIT.md](SECURITY_AUDIT.md).

## State

- All audit findings (two rounds) are fixed and covered by `backend/tests/test_security.py`.
- The frontend was folded into this repo. Its old nested git history is in `.frontend-git-backup/` (git-ignored). Delete it once you no longer need that history.
- `graphify-out/` holds the code knowledge graph (`graphify query "<question>"`, `GRAPH_REPORT.md`).

## Things to know before changing code

- **Sessions** are an httpOnly `qaab_session` cookie (`SameSite=Lax`). Cookie-authenticated writes must send an `Origin` listed in `CORS_ORIGINS`. Bearer tokens still work for API clients; browsers never receive one.
- **Logout** bumps `user.token_version`, which ends every session of that account.
- **Money** moves only inside `buy_photo` with conditional SQL updates. Keep any new balance change as `UPDATE ... SET balance = balance ± x` in one transaction.
- **Uploads** go through `process_image` only. Originals live in `DATA_DIR/originals` (never mounted); `/media` holds 1280 px previews and 640 px thumbnails. A photo can only be created from the caller's own `Upload`.
- **Schema changes**: `create_all` does not alter tables. Add in-place changes to `db._migrate()` (it runs on every start and must stay idempotent).
- **Rate limits** are in-process (`security.LIMITS`). Move them to Redis before running more than one worker.
- **Demo data** only seeds when `APP_ENV` is not `production`; `/api/health` reports `demo` so the login page knows.

## Open items (owner decisions)

1. Payment gateway with pending purchases settled by a verified callback (the wallet is a stand-in).
2. Real About, Contact, Help, Privacy and Terms pages (footer and sign-up link to `#`).
3. Self-host Vazirmatn and Outfit (Google Fonts is slow or blocked for many users in Iran).
4. Nonce-based CSP, Next.js 16 upgrade (removes the PostCSS override), watermarked previews, email verification, a cleanup job for abandoned uploads.
