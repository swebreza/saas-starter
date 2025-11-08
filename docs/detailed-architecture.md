# Studio 24 Detailed Architecture Blueprint

This document translates the Studio 24 objectives into a concrete system design that builds on the existing SaaS Starter codebase while steering it toward the AI Content Studio MVP described in `docs/Hackathon.md`, `docs/overview.md`, and `docs/architecture-summary.md`.

---

## 1. Vision Recap

Studio 24 enables creators to move from idea → text copy → repurposed video scripts → Canva-ready storyboards in under five minutes. The MVP relies on:

- **Gemini API** for all AI authored content.
- **Canva** via curated templates for design and video finishing.
- **Stripe** for monetisation (Free vs Pro).
- **Supabase/Postgres** (or equivalent) for auth, persistence, and usage metering.
- **Vercel-hosted Next.js (App Router)** as the orchestration layer.

The product must stay API driven, serverless, and profitable (>80% margin) by offloading heavy compute to managed services.

---

## 2. Current Codebase Assessment

The repository currently reflects a generalized SaaS starter kit with team collaboration primitives. Key observations:

### 2.1 Frontend (`app/`)
- **Routing:** Uses Next.js App Router. Landing page under `app/(dashboard)/page.tsx`. Dashboard and settings flow under `app/(dashboard)/dashboard/**`.
- **Auth Pages:** `app/(login)/sign-in` and `sign-up`.
- **UI:** ShadCN-inspired components in `components/ui` with Tailwind 4.1 (via PostCSS).
- **State:** SWR used globally with preloaded `/api/user` and `/api/team` data in `app/layout.tsx`.

### 2.2 Backend (`app/api/**`)
- **Auth & User:** `/api/user` exposes the authenticated profile.
- **Teams & Billing:** `/api/team`, `/api/stripe/checkout`, `/api/stripe/webhook` integrate with Stripe via helper functions in `lib/payments/stripe.ts`.
- **Session Management:** Cookie-based JWT handled in `lib/auth/session.ts` and `middleware.ts`.
- **Business Logic:** Currently oriented around team management (invitations, member management, subscription).
- **Missing AI Routes:** No `text`, `video/repurpose`, or `video/storyboard` endpoints exist yet.

### 2.3 Data Layer (`lib/db/**`)
- **ORM:** Drizzle ORM with Postgres schema for `users`, `teams`, `team_members`, `activity_logs`, and `invitations`.
- **Auth Coupling:** Users stored locally with password hashes. No Supabase integration yet.
- **Usage Tracking:** Not implemented. No `usage_logs` or plan gating fields.

### 2.4 Payments (`lib/payments`)
- Stripe helper functions already provision checkout session, customer portal, and webhook handling. Data written back to `teams` table.

### 2.5 Middleware & Actions
- `middleware.ts` protects `/dashboard` routes and refreshes the JWT cookie.
- Server actions in `app/(login)/actions.ts` handle signup/signin, team management, and Stripe operations.

---

## 3. Target Architecture Overview

Studio 24 requires a lean orchestration layer with these pillars:

1. **Frontend Studios** – Dashboard hub plus Text, Video Repurpose, Storyboard experiences.
2. **Serverless API Routes** – Auth-guarded endpoints calling Gemini, enforcing plan/usage limits.
3. **Supabase-Backed Persistence** – Profiles with `plan` field, `usage_logs`, optional `projects`.
4. **Stripe Billing** – Free vs Pro gating, webhook-driven plan changes.
5. **Canva Handoff** – Config-driven mapping from storyboard formats to template URLs.
6. **Telemetry & Limits** – Log each AI call and prevent overuse for Free tier.

---

## 4. Detailed Component Design

### 4.1 Frontend Layer

| Area | Current State | Target Studio 24 |
| --- | --- | --- |
| **Landing** | Generic SaaS marketing page | Replace messaging with Studio 24 pitch, highlight Text/Video/Storyboard flow, CTA into signup. |
| **Dashboard** | Team subscription management | Rework as content hub showing quick actions into each studio, usage counters, upgrade CTA. |
| **Studios** | Not present | Add pages under `app/studio/text`, `app/studio/video-repurpose`, `app/studio/storyboard`. Each page should:<br/>- Render forms per `Hackathon.md` inputs<br/>- Call respective API routes<br/>- Display results (cards, tabs, scene lists)<br/>- Provide copy/export buttons and Pro upgrade prompts |
| **UI Components** | Buttons, cards, inputs available | Extend with tabs, code blocks, JSON copy, loading states, upgrade modals. |

Implementation notes:
- Continue using client components for interactive experiences with Suspense/SWR for server data (plan info, usage count).
- Guard `/studio/*` routes through middleware and runtime plan checks.
- Centralise Canva template links in `lib/config.ts` or Supabase table to avoid duplication.

### 4.2 Backend API Layer

#### Existing Infrastructure
- Session resolution via `getUser()` in `lib/db/queries.ts`.
- Stripe integration already functional.

#### Required Endpoints
| Route | Purpose | Key Steps |
| --- | --- | --- |
| `POST /api/text/generate` | Text Studio | Validate request body (type/topic/tone) → check plan & usage → call `gemini.generateText()` → parse variants → log usage |
| `POST /api/video/repurpose` | Video Repurpose Studio | Validate transcript length/style → enforce Pro (or limited Free) access → call `gemini.generateRepurposeOutput()` → structure hooks/scripts/captions/summary → log usage |
| `POST /api/video/storyboard` | Storyboard Studio | Require Pro plan → prompt Gemini for strict JSON scenes → validate response → log usage |
| `POST /api/billing/create-checkout-session` | Upgrade flow | Use existing Stripe helper, but align success URL with new dashboard |
| `GET /api/user/me` | Profile | Extend to return `plan`, `usageRemaining`, feature flags |
| `GET /api/projects` (optional) | Recent work | Pull from Supabase `projects` table if history enabled |

#### Gemini Integration Layer (`lib/gemini.ts`)
- Centralise prompts, model selection, retries, and parsing.
- Use Environment variable `GEMINI_API_KEY` and server-only fetch.
- Ensure deterministic JSON outputs by configuring `responseMimeType: "application/json"` when available.

### 4.3 Authentication & Authorization

Current starter uses custom JWT cookies. To align with Studio 24 plan:

- **Option A (Preferred):** Migrate to Supabase Auth or Auth.js for user management. Persist user profiles in Supabase `public.users` with `plan` column.
- **Option B:** Keep current auth for MVP, but introduce `plan` column in `users` table and usage limits table using Drizzle. Ensure path toward Supabase compatibility is documented.

Regardless of option, implement:
- `lib/limits.ts` helper to count daily usage (`usage_logs`) and throw structured errors for `LIMIT_REACHED` or `BILLING_REQUIRED`.
- Extend middleware to redirect Free users attempting to access Pro-only studios (or let API return 402 with frontend handling).

### 4.4 Data Model

Recommended schema changes (Drizzle or Supabase):

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `users` | Profile | `id`, `email`, `name`, `plan (free/pro)`, timestamps |
| `usage_logs` | Rate limiting | `id`, `user_id`, `feature (text|video_repurpose|storyboard)`, `created_at` |
| `projects` (optional) | Saved outputs | `id`, `user_id`, `type`, `title`, `input (jsonb)`, `output (jsonb)`, `created_at` |
| `subscriptions` (optional) | Stripe mirroring | `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end` |
| `canva_templates` (optional) | Handoff config | `format`, `url`, `is_active` |

Migration path:
1. Add `plan` column to `users` with default `'free'`.
2. Create `usage_logs` table and associated index on `(user_id, created_at)`.
3. Update handlers to insert usage row after successful AI call.
4. For Supabase adoption, align table definitions with `docs/Hackathon.md` schema guidance.

### 4.5 External Integrations

#### Stripe
- Keep existing checkout + portal flow.
- Modify webhook handler to update `users.plan` (not just `teams`) and record subscription status.
- Ensure `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `BASE_URL` are configured.

#### Gemini
- Introduce typed clients in `lib/gemini.ts`.
- Implement error handling and fallback messaging like `"Generation failed, please try again."`
- Respect cost constraints by validating transcript length and caching if necessary.

#### Canva
- No server-side integration required. Provide mapping from storyboard format to template URL.
- On frontend, show CTA buttons that open Canva links in new tab. Optional: embed via iframe if allowed.

---

## 5. Security, Reliability, Performance

- **Secrets:** Store all API keys in Vercel environment variables. Never expose on client.
- **Input Validation:** Use Zod schemas on every API route before calling external services.
- **Error Responses:** Standardize on `{ success: false, error: { code, message } }`.
- **Rate Limits:** Free users limited to 10 AI calls/day across all features; Pro users higher soft cap.
- **Session Handling:** Refresh session cookies on GET (already implemented) and clear on auth errors.
- **Monitoring:** Use Vercel logs for API errors, Supabase/Stripe dashboards for failures.
- **Cost Control:** Track `usage_logs` counts for analytics and alerting once thresholds near plan limits.

---

## 6. Deployment & DevOps Alignment

- **Hosting:** Continue with Vercel for both frontend and API routes. Ensure environment variables align with `docs/deployment-playbook`.
- **Database:** Connect Drizzle to Supabase-managed Postgres (replace `POSTGRES_URL` with Supabase connection string). Run migrations via `drizzle-kit`.
- **Testing:** Locally stub Gemini responses or toggle a `MOCK_GEMINI=true` flag to avoid API costs.
- **CI/CD:** GitHub → Vercel auto deploy. Add smoke tests (e.g., hitting `/api/text/generate` with mock key).
- **Backups:** Rely on Supabase automated backups; export Stripe customer/subscription data as needed.

---

## 7. Gap Analysis & Roadmap

| Area | Current | Required Work |
| --- | --- | --- |
| **AI Features** | None | Implement `/api/text/generate`, `/api/video/repurpose`, `/api/video/storyboard`, plus corresponding UI pages. |
| **Auth/Plan** | Team-based roles, no usage limits | Add `plan` to `users`, `usage_logs`, gating helpers, upgrade flow tied to individual account rather than team. |
| **Database** | Local Postgres, team-centric tables | Introduce tables from Section 4.4. De-emphasize team features unless needed for future multi-user plan. |
| **Dashboard UX** | Subscription + team mgmt | Replace with Studio 24 control center showing generative history, CTA into studios, usage counter, upgrade prompts. |
| **Docs Alignment** | Starter template docs | Completed docs (`overview`, `architecture-summary`, `development-playbook`, this document) ensure Cursor references correct vision. |
| **Security** | Basic session refresh | Add structured error handling, limit enforcement, secure environment configuration. |
| **Canva Handoff** | Absent | Create `lib/config.ts` (or DB table) mapping storyboard formats to Canva template URLs, integrate in Storyboard UI. |

---

## 8. Next Steps

1. **Schema Update:** Add `plan`, `usage_logs`, `projects` tables via Drizzle migration; seed initial data.
2. **Gemini Wrapper:** Implement `lib/gemini.ts` with typed functions for text, repurpose, storyboard outputs.
3. **API Routes:** Build AI route handlers with validation, plan checks, and usage logging.
4. **Frontend Studios:** Create pages and UI for each studio, wire to APIs, add copy/export/upgrade UX.
5. **Dashboard Refresh:** Replace current team settings view with Studio 24 overview and integrate usage stats/history.
6. **Stripe Integration Update:** Ensure webhooks update `users.plan`; adjust checkout success redirect to new dashboard.
7. **Canva Config:** Add template mapping file/table and integrate into Storyboard CTA.
8. **Testing & Observability:** Add logging, mock configuration, and QA scripts to validate rate limits and AI responses.

Following this blueprint keeps development tightly aligned with the documented business goals while leveraging the existing starter foundation for rapid delivery.

