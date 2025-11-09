# Studio 24 · Detailed Architecture

This document defines the canonical system design for Studio 24. It captures the structure of the rebuilt codebase, service boundaries, workflow orchestration, data model, and operational expectations. Any architectural change must be reflected here before implementation.

---

## 1. System Context

```
[Browser UI / Next.js] ── HTTPS ──> [Next.js API Routes] ──> [Supabase Postgres + Storage]
        │                                │                           │
        │                                │                           ├─ Supabase Auth (JWT, RLS)
        │                                │                           └─ Supabase Edge Functions / Cron
        │                                │
        │                                ├─> [n8n Automation Hub] ──> [Social APIs, Slack/Gmail, Remotion Worker]
        │                                │
        │                                ├─> [Gemini API] (copy/ideation)
        │                                ├─> [Canva API] (visual templates)
        │                                ├─> [Remotion Worker API] (media automation)
        │                                └─> [Stripe API] (billing)
        │
        └─ Optional embedded Canva editor (iframe) for asset editing
```

- **Next.js** (Vercel): Marketing site, authenticated app, server-side APIs, event emitters to n8n.
- **Supabase**: Identity (magic link + OAuth), primary database, secure storage, scheduled jobs.
- **n8n**: Automation runtime for campaign workflows, publishing, analytics, notifications.
- **Gemini / Canva / Remotion Worker**: AI + media services invoked via server-side wrappers or n8n nodes.
- **Stripe**: Subscription billing, metered usage, invoices.

---

## 2. Repository Layout

```
app/
  (marketing)/
  (auth)/sign-in|sign-up
  (dashboard)/
    layout.tsx
    page.tsx                  # Workspace overview
  studio/
    launchpad/page.tsx        # Campaign wizard
    calendar/page.tsx         # Calendar + kanban
    automation/page.tsx       # Workflow cockpit
    analytics/page.tsx        # Insight hub
  settings/
    workspace/page.tsx
    integrations/page.tsx
    billing/page.tsx
components/
  analytics/*
  automation/*
  calendar/*
  forms/*
  layouts/*
  navigation/*
  ui/*                        # Shared Tailwind/ShadCN primitives
lib/
  auth/*                      # Auth.js + Supabase helpers
  supabase/*                  # Server/client utilities, RLS helpers
  db/
    schema.ts                 # Drizzle schema (mirrors Supabase SQL)
    migrations/*.sql
  limits.ts                   # Plan quotas & enforcement
  gemini/{prompts.ts,client.ts,parsers.ts}
  canva/{client.ts,templates.ts}
  remotion/{client.ts,types.ts}
  workflows/{n8n.ts,events.ts}
  social/{youtube.ts,instagram.ts,tiktok.ts,linkedin.ts,x.ts}
  stripe/{client.ts,webhook.ts}
app/api/
  auth/*
  content/*
  media/*
  workflows/*
  analytics/*
  billing/*
  integrations/*
  webhooks/
    n8n/route.ts
    stripe/route.ts
    social/*
workflows/
  n8n/
    campaign-launch.json
    asset-production.json
    scheduler.json
    analytics-sync.json
    notifications.json
  README.md                   # workflow promotion instructions
scripts/
  reset-local-env.ts
  seed-workspace.ts
.github/workflows/
  lint-test.yml
  deploy-workflows.yml        # ships n8n JSON to staging/prod
```

---

## 3. Authentication & Authorization

- **Provider**: Supabase Auth for identity. Auth.js (`next-auth`) uses the Supabase adapter to manage sessions inside Next.js.
- **Session**: JWT stored in HttpOnly cookie, rotated via Auth.js. `middleware.ts` blocks access to `/dashboard` and `/studio` for unauthenticated requests.
- **Workspaces**: Multi-tenant structure.
  - `workspaces`: metadata for each brand/company.
  - `workspace_members`: user membership with roles (`owner`, `editor`, `viewer`).
  - `invitations`: pending invites with email + token.
- **Integrations**: `workspace_integrations` states (connected, pending, error). Credentials stored encrypted in `credentials` table (pgcrypto) scoped to workspace.
- **Plan Enforcement**: `lib/limits.ts` exports `assertWithinPlan(userId|workspaceId, featureKey)` used in every API route. Quotas reset via scheduled job.
- **Scopes**: Fine-grained feature flags for beta modules stored in `plan_features` table and cached in Redis (optional).

---

## 4. Data Model (Supabase / Drizzle)

All IDs are UUID. Timestamps default to `now()`. RLS ensures row-level tenant isolation.

### Core Tables
- `users` — `id`, `email`, `name`, `avatar_url`, `plan (free|pro|agency)`, `stripe_customer_id`, `onboarded_at`.
- `workspaces` — `id`, `name`, `slug`, `primary_brand_id`, `created_by`.
- `workspace_members` — `id`, `workspace_id`, `user_id`, `role`, `status`.
- `workspace_integrations` — `id`, `workspace_id`, `provider`, `status`, `credential_id`, `metadata`.
- `credentials` — `id`, `provider`, `workspace_id`, `encrypted_value`, `refresh_token`, `expires_at`.
- `brands` — `id`, `workspace_id`, `name`, `voice`, `tone`, `fonts`, `colors`, `default_platforms`, `guidelines`.

### Campaign & Asset Tables
- `campaigns` — `id`, `workspace_id`, `brand_id`, `title`, `objective`, `status (draft|producing|scheduled|completed)`, `launch_date`, `timezone`.
- `campaign_inputs` — `id`, `campaign_id`, `audience`, `offer`, `platforms`, `tone`, `source_assets (jsonb)`, `notes`.
- `campaign_assets` — `id`, `campaign_id`, `type (copy|image|video|report)`, `status`, `source (gemini|canva|remotion|manual)`, `payload (jsonb)`, `storage_path`.
- `campaign_tasks` — `id`, `campaign_id`, `task_type`, `assigned_to`, `due_at`, `completed_at`.

### Automation Tables
- `automation_runs` — `id`, `workspace_id`, `workflow_key`, `triggered_by`, `status (queued|running|succeeded|failed|cancelled)`, `n8n_execution_id`, `input (jsonb)`, `output (jsonb)`, `cost_estimate`.
- `automation_events` — `id`, `run_id`, `event_type`, `payload`, `logged_at`.
- `scheduled_posts` — `id`, `workspace_id`, `campaign_id`, `platform`, `status`, `scheduled_at`, `published_at`, `platform_post_id`, `error_message`.

### Analytics Tables
- `analytics_metrics` — `id`, `workspace_id`, `platform`, `metric_key`, `metric_value`, `recorded_at`, `dimensions (jsonb)` (e.g. post_id, account_id).
- `analytics_insights` — `id`, `workspace_id`, `insight_type`, `headline`, `description`, `supporting_data (jsonb)`, `generated_at`.
- `reports` — `id`, `workspace_id`, `title`, `period_start`, `period_end`, `filters (jsonb)`, `data (jsonb)`.

### Billing & Usage
- `subscriptions` — `id`, `workspace_id`, `plan`, `stripe_subscription_id`, `status`, `current_period_end`, `seat_limit`, `post_credit_limit`.
- `usage_counters` — `id`, `workspace_id`, `feature_key`, `period_start`, `period_end`, `count`.
- `billing_events` — `id`, `workspace_id`, `stripe_event_id`, `payload`, `processed_at`.

### Audit & Notifications
- `notifications` — `id`, `workspace_id`, `recipient_id`, `category`, `title`, `body`, `cta`, `read_at`.
- `audit_logs` — `id`, `workspace_id`, `actor_id`, `action`, `target_type`, `target_id`, `metadata`.

Detailed schema with column types, indexes, and RLS policies is maintained in `lib/db/schema.ts` and Supabase migration scripts.

---

## 5. Automation Workflows (n8n)

Workflows live in `workflows/n8n/*.json`. They must be version-controlled and deployed via CI (`deploy-workflows.yml`).

### 5.1 Campaign Launch (`campaign-launch.json`)
1. **Trigger**: HTTP webhook call from `/api/content/campaign`.
2. **Nodes**:
   - Fetch campaign + brand from Supabase.
   - Gemini copy ideation (HTTP node) using `campaign_inputs`.
   - Transform output to canonical JSON.
   - Supabase upsert into `campaign_assets`.
   - Optional Slack/Gmail approval request.
3. **Result**: Update `campaign.status = 'producing'`, emit events via `/api/webhooks/n8n`.

### 5.2 Asset Production (`asset-production.json`)
1. Triggered when user approves concepts.
2. Nodes call Canva template API (image/video) and Remotion Worker (auto reels, captions).
3. Upload media to Supabase storage; update `campaign_assets`.
4. Notify stakeholders (Slack/email/in-app).

### 5.3 Scheduler (`scheduler.json`)
1. Triggered by `/api/workflows/schedule`.
2. For each post:
   - Retrieve social credentials via secure Next.js proxy.
   - Format payload per platform rules.
   - Schedule or publish (YouTube, Meta, TikTok, LinkedIn, X).
   - Log success/failure in `scheduled_posts` and `automation_events`.

### 5.4 Analytics Sync (`analytics-sync.json`)
1. Cron (nightly per workspace timezone).
2. Pull metrics from each connected platform.
3. Store raw metrics (`analytics_metrics`), compute insights (via Gemini summariser or rule engine).
4. Generate PDF/HTML reports on demand.

### 5.5 Notifications (`notifications.json`)
- Listens to automation events (assets ready, approvals pending, failures).
- Routes communications via Slack, email, or in-app notifications.
- Respects user notification preferences stored in `workspace_members`.

**Retry/Observability**: All workflows set retry attempts (3x) and on-failure branch to send alerts. n8n execution IDs are mirrored in `automation_runs`.

---

## 6. Critical Flow Sequences

### 6.1 New Campaign → Published Posts
1. User completes Launchpad → `POST /api/content/campaign`.
2. API validates payload (Zod), asserts plan quota, creates `campaign` + `campaign_inputs`, triggers n8n Launch workflow.
3. n8n generates copy → webhook `/api/webhooks/n8n/campaign-result` updates assets + emits notifications.
4. User reviews/edits copy, selects visuals (Canva/Remotion) → API triggers Asset Production workflow.
5. User schedules posts → `POST /api/workflows/schedule` → scheduler workflow queues posts.
6. Publishing success/failure → `/api/webhooks/n8n/workflow-event` updates `scheduled_posts` & `automation_runs`. Failures appear in Automation Cockpit with retry action.
7. Analytics workflow pulls metrics; UI displays insights in Analytics Hub.

### 6.2 Billing & Usage
1. Upgrade CTA → `POST /api/billing/create-checkout-session` → Stripe Checkout.
2. Stripe webhook updates `subscriptions`, recalculates `usage_counters`.
3. `lib/limits` references plan features to enable automation quotas, seat limits, overage pricing.

### 6.3 Automation Failure Recovery
1. n8n sends failure event with run ID + error.
2. API updates `automation_runs.status = 'failed'`, writes `automation_events`, triggers notification workflow.
3. User clicks “Retry” → `/api/workflows/retry` clones run, replays workflow with same inputs.
4. Observability pipeline tracks retry success rate.

---

## 7. Integration Contracts

| Integration | Access Pattern | Auth | Notes |
| --- | --- | --- | --- |
| Gemini | Next.js server fetch | API key (`GEMINI_API_KEY`) | Structured prompts; JSON responses; retry with exponential backoff. |
| Canva | OAuth redirect in-app; API calls from n8n | OAuth (per user/workspace) | Template IDs stored in `canva_templates`; fallback to open-in-Canva links if API fails. |
| Remotion Worker | n8n HTTP node via Next.js proxy (`/api/media/remotion/*`) | AWS credentials + site ID | Used for automated video/audio renders. Documented in `docs/remotion.md`. |
| Social APIs | n8n HTTP nodes via Next.js proxy | OAuth per platform | Refresh tokens managed by Next.js; short-lived access tokens passed to n8n run. |
| Stripe | Next.js server fetch + webhook | Secret keys + webhook secret | Manages subscriptions, metered usage, invoices. |
| Slack/Gmail | Optional | OAuth | For notification workflows and approvals. |

Any unsupported Remotion capability must have fallback (Shotstack, custom FFmpeg). Document alternatives and selection rationale.

---

## 8. Environment & Deployment

- **Hosting**: Vercel (Next.js), Supabase (DB/auth/storage), Fly.io or Railway (n8n container), optional Upstash Redis.
- **Environments**: `local`, `staging`, `production` with separate Supabase/n8n instances.
- **Secrets**: Managed via Vercel env vars and Supabase secret store. n8n credentials stored encrypted in n8n.
- **CI/CD Pipeline**:
  - PR: lint (`pnpm lint`), type-check (`pnpm typecheck`), unit tests (`pnpm test`).
  - Merge to `main`: deploy to Vercel, run `pnpm db:migrate` (or Supabase CLI), deploy n8n workflows via `deploy-workflows.yml`.
  - Feature flags toggled via Supabase config tables.
- **Backups**: Supabase automated backups + manual exports for production; n8n export pipeline keeps workflow JSON snapshots in Git.
- **Local Dev**: Docker Compose optional (Supabase local + n8n container). `.env.example` documents required variables. CLI script `scripts/reset-local-env.ts` resets seeds.

---

## 9. Security & Compliance

- **Row-Level Security**: All tables enforce `workspace_id` or `user_id` filters. Helper views may expose aggregated analytics.
- **Secrets Hygiene**: No client-side direct calls to third-party APIs requiring secrets. Use server proxies.
- **Audit Trails**: `audit_logs` capture significant user actions (campaign changes, workflow triggers, billing updates). Logs mirrored to external sink (e.g., Logflare).
- **Data Privacy**: Support user/workspace deletion (cascade to associated records). Document in privacy policy.
- **API Compliance**: Respect platform guidelines (rate limits, content policies). Provide knob in workflows to label AI-generated content if required by platform.
- **Monitoring**: Integrate Sentry (frontend + backend), n8n built-in alerts, Supabase logs. Alert on automation failure rates, billing sync errors, quota breaches.

---

## 10. Testing & Observability

- **Testing Pyramid**:
  - Unit: `lib/gemini`, `lib/limits`, `lib/social`, `lib/workflows`.
  - Integration: API routes with mocked external services using MSW/supertest.
  - Workflow Tests: n8n “dev” instance with mocked credentials; run via Postman collection or n8n CLI.
  - E2E: Playwright covering onboarding → campaign launch → scheduling → analytics → billing upgrade.
  - Visual Regression: Chromatic or Storybook snapshots for critical marketing/app flows.
- **Cost Monitoring**: Record AI/automation cost estimates per run. Dashboard for monthly spend vs revenue.
- **Logging**: Use structured logger (e.g., pino) with request IDs. n8n execution IDs stored in `automation_runs` for traceability.
- **Alerting**: PagerDuty/Slack integration for automation failures over threshold, Stripe webhook failures, Supabase error spikes.

---

## 11. Implementation Alignment

| Roadmap Phase | Architecture Deliverables |
| --- | --- |
| Phase 0 | Research reports, Remotion Worker decision, competitor analysis. |
| Phase 1 | Complete rewrite of documentation suite (this file, overview, architecture summary, environment, playbook, roadmap, limits, Canva, Gemini, n8n, Remotion, social). |
| Phase 2 | Auth strategy finalized, Supabase schema migrations, baseline UI shell, plan enforcement scaffolding. |
| Phase 3 | n8n workflows authored, API endpoints for workflow orchestration, automation cockpit UI. |
| Phase 4 | AI content engine (Gemini), Canva/Remotion integrations, brand library, asset storage. |
| Phase 5 | Scheduling + analytics automation, Stripe metering, calendar UI, marketing site refresh. |
| Phase 6 | QA, security review, load testing, monitoring/alerting setup, launch checklist. |

---

## 12. Open Questions

1. **Remotion Worker Scope** – Confirm supported features (auto clipping, voiceover, captioning). If unavailable, select alternative and update docs.
2. **Social Platform Coverage** – Minimum at launch: Instagram, Facebook, TikTok, YouTube, LinkedIn, X. Determine OAuth scope complexity and sequencing.
3. **Marketplace/Partner Integrations** – Not in MVP but plan for Notion, Webflow, Shopify connectors; document design for future phases.
4. **Service-Level Agreements** – Define uptime/response time commitments for Agency plan (may require paid support tooling).

Document answers here before implementation begins.

--- 

This architecture is the single source of truth for Studio 24. Keep it current as the system evolves.

