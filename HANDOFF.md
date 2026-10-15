# HANDOFF — security, performance and UX hardening

Branch: `security/red-blue-audit-hardening` (work in progress, no PR yet).

## Done
- Frontend folded into the main repo. Its old nested git history is kept in `.frontend-git-backup/` (git-ignored).
- Stale staged `main.py` (PyCharm sample) removed from the index.
- `.gitignore` extended for frontend build output and the backup folder.
- Read-only audit workflow started (7 dimensions, Opus finders, Sonnet cross-check).
  Resume it with run id `wf_6b14acef-d9d`.

## Confirmed by code reading (fix next)
| Sev | Area | Issue | Planned fix |
|---|---|---|---|
| Critical | `api.py` register | Client can set `role` (incl. admin) | Drop `role` from `RegisterIn`, always `creator` |
| Critical | `api.py` buy | Purchase credits seller without debiting buyer; `license` free text | Wallet debit with 402 on low balance, `Literal["standard","extended"]`, one purchase per user+photo+license |
| High | `api.py` upload | Any extension/content/size stored and served from API origin | Magic-byte check (jpeg/png/webp), 10 MB cap, server-chosen extension, `nosniff` + sandbox CSP on `/media` |
| High | `schemas.py` UserOut | Public endpoints expose email and balance | `PublicUserOut` for creators/authors; full `UserOut` only on `/auth/me` |
| High | `PhotoIn.url` + `mediaUrl` | Arbitrary URL rendered as link/img | Accept only own `/media/...` or https; frontend `mediaUrl` allowlists schemes |
| High | `config.py` | Default `SECRET_KEY`, CORS `*` with credentials | Random ephemeral key in dev, refuse default in prod; explicit origin list |
| Medium | auth | No login throttling, 7-day JWT, PBKDF2 120k | In-memory O(1) rate limiter, 24h TTL, PBKDF2 600k with rehash-on-login |
| Medium | all | No security headers on API or Next.js | Header middleware + `headers()` in `next.config.ts` |
| Medium | validation | No length/number bounds, negative offset, unbounded `creators` limit, mission id not checked | Field constraints, `ge/le` on queries, 404 on unknown mission |
| Medium | models | Duplicate likes possible under race | Unique constraint on (user_id, photo_id) |
| Medium | deps | `next` 15.5.25 advisory (fixed 15.5.27), postcss, sharp, source-map-js | Bump next, `npm audit fix` |
| Low | Docker | API runs as root | Non-root user |
| Perf | `photo_out` | N+1 author and like queries per photo | Batch load authors and liked set per list |
| Perf | SQLite | No WAL / busy timeout | Pragmas on connect |
| Info | `stats` | `paid_out` adds a hard-coded 4.82B | Owner decision: label as demo or remove |

## Still to do
1. Apply the fixes above plus anything new from the audit workflow.
2. Backend security regression tests (pytest + TestClient) asserting each fix.
3. Frontend: security headers/CSP, safe `mediaUrl`, then Apple-style UX pass (press feedback, springs, reduced motion/transparency, focus states).
4. Ponytail review of the final diff; Sonnet re-check.
5. `graphify` build, then report `SECURITY_AUDIT.md` with attack tree and before/after perf numbers.
6. Commit, push, open the PR.
