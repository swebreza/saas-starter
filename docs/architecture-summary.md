## Architecture Summary · Studio 24

### Design Tenets
1. **Automation-Centric** – n8n orchestrates long-running workflows; the app focuses on configuration, approvals, and insights.
2. **Composable Services** – Next.js (UI/API), Supabase (auth + data), Gemini (copy), Canva + Remotion Worker (visual/media), Stripe (billing) cooperate through typed contracts.
3. **Documentation-Driven** – Every architectural decision is reflected here before implementation to keep Cursor and contributors aligned.
4. **Monetization-Ready** – Feature flags, quotas, and plan-aware logic permeate every layer to support paid tiers out of the box.

### Logical Stack
| Layer | Responsibility | Technologies / Modules |
| --- | --- | --- |
| **Presentation** | Marketing site, dashboard, editors, analytics | Next.js App Router, React Server Components, Tailwind, ShadCN |
| **Application/API** | Auth enforcement, validation, plan gating, workflow triggers, data access | Next.js route handlers under `app/api/**`, Zod validators, `lib/limits`, `lib/workflows` |
| **Automation Orchestration** | Long-running jobs (generation → publish → analytics), retries, notifications | n8n self-hosted instance, workflow JSON templates versioned in repo |
| **Integration Layer** | Wrappers for Gemini, Canva, Remotion Worker, social APIs, Stripe, Supabase client utilities | `lib/gemini`, `lib/canva`, `lib/remotion`, `lib/social`, `lib/stripe`, `lib/supabase` |
| **Data Layer** | Persistent storage, workspaces, content calendars, analytics snapshots, automation run logs | Supabase/Postgres (Drizzle migrations), Supabase Storage for media, Redis (optional cache) |
| **Observability** | Logs, metrics, alerts | Supabase logs, n8n execution history, Vercel analytics, Logflare/BetterStack (TBD) |

### Core Services & Responsibilities
- **Next.js App** (`/app`, `/components`) – Authenticated workspace UI, marketing site, onboarding, content calendar, analytics dashboards, billing surfaces.
- **API Routes** (`/app/api/**/route.ts`) – Secure interface between frontend and services. Key groups:
  - `/api/auth/*`: sign-in, callback, session management (NextAuth + Supabase adapter).
  - `/api/workflows/*`: trigger, poll, cancel n8n executions; webhook receivers to update run status.
  - `/api/content/*`: capture inputs, call Gemini, persist drafts, emit events to n8n.
  - `/api/media/*`: request Canva/Remotion assets, fetch template manifests, manage brand libraries.
  - `/api/billing/*`: Stripe checkout sessions, customer portal, webhook reconciliation.
  - `/api/analytics/*`: fetch aggregated metrics, export reports.
- **n8n Instance** – Hosts automation templates for campaign ideation, asset assembly, scheduling, analytics sync, notifications. Communicates via signed webhooks and REST API using an internal service token.
- **Remotion Worker Integration** – Serverless rendering pipeline (e.g., auto video clipping/voiceover). Used by n8n workflows; configuration stored in Supabase and exposed through `/api/media/remotion/*` proxies when direct browser access is not allowed.
- **Supabase** – Identity provider (email magic link + OAuth), PostgreSQL storage, Row Level Security, scheduled functions for lightweight jobs, object storage for media artifacts.
- **Stripe** – Handles subscription payments, invoicing, metered add-ons.

### High-Level Flow Overview
1. **Onboarding & Workspace Provisioning**
   - User signs up → `users`, `workspaces`, `workspace_members` rows created.
   - Default automation templates and brand library entries seeded.
   - Optional integration checklists (connect social accounts, Canva, Remotion Worker credentials) stored in `workspace_integrations`.
2. **Campaign Launchpad**
   - Frontend collects campaign brief → `POST /api/content/campaign` → persists `campaigns` + `campaign_inputs` → triggers `n8n` “Ideation” workflow.
   - n8n calls Gemini for copy concepts, returns structured payload via webhook → stored in `campaign_assets` and surfaced in UI.
3. **Visual Production**
   - User selects concepts → `/api/media/canva` generates template links; `/api/media/remotion/render` requests auto video variants when needed.
   - Outputs stored in Supabase storage; metadata captured for analytics and billing.
4. **Scheduling & Publishing**
   - Approved assets → `POST /api/workflows/schedule` with per-platform settings.
   - n8n “Scheduling” workflow handles OAuth tokens, queues posts, confirms success/failure via webhook → updates `scheduled_posts`, `automation_runs`, sends notifications.
5. **Analytics Loop**
   - Nightly cron (Supabase function or n8n scheduled workflow) pulls metrics from social APIs, stores in `analytics_metrics`, computes `analytics_insights` records.
   - UI consumes aggregated views, highlights suggestions for next campaigns.
6. **Billing & Usage Enforcement**
   - Stripe webhooks update `subscriptions`, `usage_counters` table; `lib/limits` checks quotas before triggering workflows.
   - Overages create metered usage events; agency tier supports add-on purchases.

### Key Data Entities (overview)
- `users`, `profiles`, `workspaces`, `workspace_members`
- `integrations` (Canva, Remotion Worker, n8n credentials), `social_accounts` (per platform tokens)
- `campaigns`, `campaign_inputs`, `campaign_assets`, `campaign_tasks`
- `scheduled_posts`, `automation_runs`, `automation_events`
- `analytics_metrics`, `analytics_insights`, `reports`
- `subscriptions`, `usage_counters`, `plan_features`
- `notifications`, `audit_logs`

Detailed schemas appear in `docs/detailed-architecture.md`.

### External Integrations & Boundaries
| Service | Direction | Purpose | Notes |
| --- | --- | --- | --- |
| Google Gemini | App → Gemini | Copy generation, ideation, highlight extraction | Server-only calls via API key; prompt templates versioned in repo |
| Canva Create APIs | App ↔ Canva | Template creation, asset editing handoff | Users auth via Canva OAuth; template IDs stored per workspace |
| Remotion Worker | n8n → Remotion Worker (via app proxy) | Automated media rendering (clips, voiceovers, reels) | Uses Remotion Lambda; fallback doc outlines alternate service |
| n8n | App ↔ n8n | Workflow execution, automation state | Jobs triggered via REST; results via signed webhooks |
| Social APIs (YouTube, Meta, TikTok, LinkedIn, X) | n8n ↔ Platforms | Schedule posts, fetch analytics | OAuth tokens stored encrypted in Supabase; TTL & refresh logic documented |
| Stripe | App ↔ Stripe | Billing, invoicing, metered usage | Checkout & portal via API; webhooks update plan state |
| Supabase | App ↔ Supabase | Auth, database, storage, functions | Primary datastore; RLS ensures tenant isolation |

### Non-Functional Requirements
- **Performance**: P95 < 1.5s for dashboard queries; AI-triggered flows respond within 5s with “processing” status (final assets may take longer via n8n).
- **Security**: All tokens encrypted at rest; RLS enforced for multi-tenant data; webhook signatures validated; least-privilege service accounts for n8n/Remotion Worker.
- **Reliability**: n8n workflows idempotent with retry logic; automation runs tracked in `automation_runs` with manual retry hooks; backups scheduled for DB and storage.
- **Cost Control**: Monitor AI usage, automation runtime, media rendering costs; throttle free-tier workflows; log per-run cost metadata for profitability analytics.
- **Observability**: Centralized logging (structured JSON), n8n run history mirrored into Supabase, alerting on failed jobs, billing sync, or quota breaches.

### Execution Guardrails
- Update this summary before modifying architecture or integrations.
- Align feature work with `docs/implementation-roadmap.md` milestones.
- Keep automation workflows versioned and reviewed alongside application changes.
- Prefer free/self-hosted tiers first; record trade-offs when paid services are required.
