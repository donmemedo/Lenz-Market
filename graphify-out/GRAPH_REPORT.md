# Graph Report - Lenz-Market  (2026-10-22)

## Corpus Check
- 47 files · ~24,016 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 7, .example 1, .css 1)

## Summary
- 443 nodes · 1131 edges · 25 communities (15 shown, 10 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `314a82cb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- API Routes & Wallet Logic
- Frontend Pages
- Security Regression Tests
- Frontend Tooling & Deps
- TypeScript Config
- main.py
- Locale Shell (Header/Footer)
- entrypoint.sh
- Duplicate Likes Under Race (Medium)
- RateLimiter
- qaab-api Service
- Root Layout & Providers
- Backend Runtime Requirements
- Next.js CSP Config
- App Icon
- Purchases & Licensing
- Test Tooling
- JWT Auth
- PostCSS Config
- Audit Workflow Docs
- Bilingual RTL & Persian UX
- Compose Stack
- Qaab security, performance and UX audit

## God Nodes (most connected - your core abstractions)
1. `User` - 32 edges
2. `useI18n()` - 29 edges
3. `Photo` - 21 edges
4. `Reveal()` - 20 edges
5. `PhotoCard()` - 19 edges
6. `mediaUrl()` - 19 edges
7. `next` - 19 edges
8. `api` - 18 edges
9. `num()` - 18 edges
10. `photo_outs()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Arbitrary Photo URL Rendered as Link/Img (High)` --references--> `mediaUrl()`  [INFERRED]
  HANDOFF.md → frontend/lib/api.ts
- `photo_out N+1 Author/Like Queries (Perf)` --references--> `photo_outs()`  [INFERRED]
  HANDOFF.md → backend/app/api.py
- `Findings and status` --references--> `PublicUserOut`  [INFERRED]
  SECURITY_AUDIT.md → backend/app/schemas.py
- `Findings and status` --references--> `mediaUrl()`  [INFERRED]
  SECURITY_AUDIT.md → frontend/lib/api.ts
- `Register Role Escalation (Critical)` --references--> `RegisterIn`  [EXTRACTED]
  HANDOFF.md → backend/app/schemas.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Docker Compose Deployment Stack** — docker_compose_api, docker_compose_web, docker_compose_volumes, docker_compose_secret_key_env, docker_compose_cors_origins [EXTRACTED 1.00]
- **Critical/High API Trust-Boundary Findings** — handoff_register_role_escalation, handoff_buy_without_debit, handoff_unrestricted_upload, handoff_public_user_pii_exposure, handoff_arbitrary_photo_url, handoff_insecure_config_defaults [EXTRACTED 1.00]
- **Photo Purchase and Wallet Flow** — readme_wallet, readme_photo_licensing, handoff_buy_without_debit, readme_rest_api [INFERRED 0.85]

## Communities (25 total, 10 thin omitted)

### Community 0 - "API Routes & Wallet Logic"
Cohesion: 0.06
Nodes (64): buy_photo(), categories(), create_photo(), creator_profile(), creators(), download(), earnings(), get_mission() (+56 more)

### Community 1 - "Frontend Pages"
Cohesion: 0.10
Nodes (73): CreatorPage(), CreatorsPage(), DashboardPage(), Earnings, ExploreInner(), ExplorePage(), Field(), LoginInner() (+65 more)

### Community 2 - "Security Regression Tests"
Cohesion: 0.08
Nodes (28): reset_rate_limits(), client(), _fresh_limits(), login(), png_bytes(), register(), _photo_not_owned_by(), test_buy_debits_buyer_and_credits_seller_once() (+20 more)

### Community 3 - "Frontend Tooling & Deps"
Cohesion: 0.04
Nodes (42): compat, __dirname, eslintConfig, __filename, dependencies, framer-motion, lucide-react, next (+34 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 5 - "main.py"
Cohesion: 0.06
Nodes (16): _secret_key(), get_session(), init_db(), _migrate(), _pragmas(), health(), lifespan(), BodyLimit (+8 more)

### Community 6 - "Locale Shell (Header/Footer)"
Cohesion: 0.23
Nodes (9): LocaleLayout(), Footer(), LocaleProvider(), defaultLocale, Dict, getDict(), isRtl(), Locale (+1 more)

### Community 11 - "qaab-api Service"
Cohesion: 0.11
Nodes (19): fastapi==0.143.2, sqlmodel==0.0.48, qaab-api Service, CORS_ORIGINS Env, QAAB_SEED_DEMO Flag, qaab-data / qaab-media Volumes, qaab-web Service, Frontend README (create-next-app boilerplate) (+11 more)

### Community 12 - "Root Layout & Providers"
Cohesion: 0.33
Nodes (5): metadata, RootLayout(), viewport, AuthProvider(), Providers()

### Community 15 - "Next.js CSP Config"
Cohesion: 0.50
Nodes (3): api, csp, nextConfig

### Community 16 - "App Icon"
Cohesion: 0.67
Nodes (4): Lenz Market App Icon, Brand Gradient (#6d3fff to #00c5e0), Camera Outline Glyph, Camera Lens Circle

### Community 17 - "Purchases & Licensing"
Cohesion: 0.50
Nodes (4): Purchase Credits Seller Without Debiting Buyer (Critical), Photo Licensing (Standard / Unlimited Commercial), Roadmap: PWA, Capacitor APK/IPA, Iranian Payment Gateway, Creator Wallet and Sales Dashboard

### Community 18 - "Test Tooling"
Cohesion: 0.67
Nodes (3): httpx==0.28.1, pytest==9.1.1, Backend Security Regression Tests (pytest + TestClient)

### Community 19 - "JWT Auth"
Cohesion: 0.67
Nodes (3): PyJWT==2.15.1, Weak Auth Controls: No Throttling, 7-day JWT, PBKDF2 120k (Medium), JWT Authentication

### Community 26 - "Qaab security, performance and UX audit"
Cohesion: 0.14
Nodes (13): HANDOFF: Security, Performance and UX Hardening, Qaab README, Attack tree, Blue-team notes, Findings and status, How to verify, Method, Performance (+5 more)

## Knowledge Gaps
- **40 isolated node(s):** `react-dom`, `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 174 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `mediaUrl()` connect `Frontend Pages` to `API Routes & Wallet Logic`, `Qaab security, performance and UX audit`?**
  _High betweenness centrality (0.396) - this node is a cross-community bridge._
- **Are the 25 inferred relationships involving `User` (e.g. with `buy_photo()` and `create_photo()`) actually correct?**
  _`User` has 25 INFERRED edges - model-reasoned connections that need verification._
- **What connects `react-dom`, `@tailwindcss/postcss`, `@types/node` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Routes & Wallet Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.06323232323232324 - nodes in this community are weakly interconnected._
- **Why does `Findings and status` connect `Qaab security, performance and UX audit` to `API Routes & Wallet Logic`, `Frontend Pages`?**
  _High betweenness centrality (0.249) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `Photo` (e.g. with `buy_photo()` and `create_photo()`) actually correct?**
  _`Photo` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Should `Frontend Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.10215053763440861 - nodes in this community are weakly interconnected._