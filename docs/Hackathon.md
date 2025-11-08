# Studio 24 Strategic Dossier

This dossier consolidates every critical document required to build, market, and operate Studio 24 as a premium social media content engine. Treat it as the ground truth: when product direction changes, update this file (and its referenced companions) before writing code.

---

## 📘 Business Requirements Document (BRD)

### 1. Executive Summary
Studio 24 is a premium SaaS that turns a single idea into campaign-ready assets across TikTok, Instagram, YouTube Shorts, LinkedIn, X, and more. By orchestrating Google Gemini for intelligence, Canva for execution, and an automated rendering pipeline for downloadable reels, we remove the tool-sprawl that creators, social media managers, and agencies currently endure. The promise: **“Idea in — multi-platform content out in minutes.”**

### 2. Business Goals
| Goal | Description | Measurable Target |
| --- | --- | --- |
| Premium Activation | Convert time-strapped creators and agencies into paying subscribers | ≥ 12% Free → Premium conversion in first 7 days |
| Time-to-Value | Deliver first export-ready asset rapidly | < 5 minutes from signup to exported content |
| Profitability | Maintain healthy unit economics | > 80% gross margin at MVP stage |
| Retention | Keep creators returning for campaign workflows | ≥ 40% weekly active rate by week 3 |
| Auto Reel Adoption | Prove demand for automated short-form exports | ≥ 3 downloads per Premium creator in first month |

### 3. Problem Statement
Content leaders lose hours context-switching between idea generation (ChatGPT), scripting (Docs), design (Canva), and social scheduling tools. Output consistency suffers, briefs get lost, and agencies struggle to justify premium retainers. Existing AI tools rarely go beyond text or single-platform snippets, forcing manual work to adapt outputs per channel.

### 4. Solution Overview
Studio 24 delivers:
- **Text Studio:** On-brand, platform-ready hooks, captions, scripts, and outlines tuned to the user’s voice.
- **Video Repurpose Studio:** Transcript → shorts playbooks, teaser scripts, and caption packs for vertical video.
- **Storyboard Studio:** Structured scene timelines with one-click Canva templates for visual execution.
- **Usage-aware Monetization:** Free tier proves value; Premium unlocks limitless runs, Canva handoffs, and saved projects.
- **Auto-Reels Renderer:** YouTube URL → multiple downloadable shorts with animated overlays, captions, and speaker-aware framing for Premium users.

### 5. Target Audience
| Segment | Needs | Why Studio 24 Wins |
| --- | --- | --- |
| Professional Creators & Influencers | Daily multi-platform content without hiring | AI-guided workflows that respect personal brand voice |
| Social Media Managers & Boutique Agencies | Faster client deliverables, higher margins | Repeatable processes, sharable exports, USD pricing |
| Growth Startups & SMBs | Premium social presence without headcount | Guided campaigns, consistent tone, predictable spend |

### 6. Unique Value Proposition
- Cross-platform output in one flow.
- Premium positioning with USD pricing and agency-grade polish.
- Structured JSON responses power consistent UI, exports, analytics.
- Canva handoff eliminates the AI-to-design gap.
- Automated reel rendering produces ready-to-post MP4s without manual editing.

### 7. Competitive Landscape
| Competitor | Focus | Gap Filled by Studio 24 |
| --- | --- | --- |
| Jasper.ai | Long-form copy | Lacks video/studio orchestration |
| Pictory.ai | Video repurposing | No integrated copy, no Canva bridge |
| Copy.ai | Marketing copy | Text-only, no social-first workflows |
| Opus Clip / Captions.ai | Automated shorts remix | Limited branding controls, no multi-output download hub |
| Opus Pro | Shorts repurposing | Missing structured storyboard + Canva |

### 8. Success Metrics
- Time-to-first-export < 5 minutes.
- Premium upgrade within first three high-value prompts.
- Weekly active Premium creators ≥ 40%.
- Net promoter score ≥ 45 at MVP review.

### 9. Constraints & Assumptions
- **Constraints:** Ship on Vercel; rely on Gemini, Canva, Stripe, Supabase, and a managed video rendering API (e.g., Shotstack) configured via server-side wrappers. No bespoke GPU clusters or native mobile apps in MVP.
- **Assumptions:** Gemini API remains stable; Canva share links allowed; Stripe supported in target geographies; rendering provider offers SLA-aligned turnaround and webhooks/polling.

### 10. Monetization Strategy
- **Free Plan:** 10 generations/day, Text Studio access, repurpose/storyboard previews with upsells.
- **Premium Plan (USD):** Unlimited studios, Canva handoffs, saved projects, priority prompting.
- **Future Upsells:** Team workspaces, brand libraries, analytics, campaign playbooks.

---

## 🧩 Product Requirements Document (PRD)

### 1. Purpose
Translate the BRD into user experiences, feature scope, and acceptance criteria that deliver a sellable, premium MVP.

### 2. Product Summary
From a single dashboard, Studio 24 guides users through:
1. Inputting an idea, brief, or transcript.
2. Generating platform-specific copy bundles.
3. Repurposing long-form videos into shorts blueprints.
4. Converting scripts into storyboards and Canva-ready templates.
5. Rendering downloadable reels/shorts with captions, overlays, and speaker focus (Premium).

### 3. MVP Scope
| Included | Excluded (Post-MVP) |
| --- | --- |
| Text Studio, Video Repurpose Studio, Storyboard Studio, Auto Reels Rendering | AI voiceover, automated scheduling, team collaboration |
| Authentication & plan gating | Native mobile apps |
| Stripe billing & usage logging | Real-time analytics dashboard (basic reporting later) |
| Canva template links/embeds | Direct Canva asset injection |

### 4. Core Modules & Acceptance Criteria
1. **Authentication & User Profiles**
   - Supabase/Auth.js sessions.
   - `users` table with `plan` flag.
   - Unauthorized access redirects to login.
2. **Dashboard**
   - Highlights plan status, next best actions, recent projects.
   - Loads under 2 seconds; responsive.
3. **Text Studio (Free & Premium)**
   - Inputs: content type, topic, tone, audience.
   - Outputs: ≥3 variants with platform tags and copy buttons.
   - Limits: Free 10/day; Premium unlocked.
4. **Video Repurpose Studio (Premium)**
   - Inputs: transcript/YouTube URL, tone, target platforms.
   - Outputs: hooks, short scripts, captions w/ hashtags, summary script.
   - “Send to Storyboard” action available.
5. **Storyboard Studio (Premium)**
   - Inputs: script, format, duration.
   - Outputs: structured scenes array with timecodes, visuals, overlays, voiceover lines.
   - One-click Canva template link.
6. **Auto Reels Studio (Premium)**
   - Inputs: YouTube URL (or uploaded video), desired number of shorts, style preset.
   - Process: extract transcript, identify speaker segments, use Gemini to propose beat sheet, queue rendering jobs via `lib/video-renderer`.
   - Outputs: multiple MP4 downloads with burned-in captions, animations, thumbnails, metadata for social uploads.
   - Success: Premium-only access, status polling, cost telemetry, download history per user.
7. **Billing**
   - Stripe Checkout session creation.
   - Webhooks update plan state.
   - Upgrade/downgrade reflected immediately.
8. **Projects (Optional but Recommended)**
   - Save outputs for Premium users.
   - Display recent activity on dashboard.

### 5. User Stories (Priority High unless noted)
- As a creator, I generate hooks and captions that match my brand voice.
- As a premium user, I repurpose transcripts into shorts scripts that match each platform’s tone.
- As a premium user, I convert scripts into storyboard scenes and open Canva templates.
- As a premium user, I drop a YouTube link and receive multiple downloadable reels with captions and motion graphics.
- As a free user, I understand why I should upgrade after hitting limits.
- As an operator, I view usage logs to forecast API costs. (Medium priority)

### 6. Non-Functional Requirements
- Average API response < 5 seconds; retries with friendly messaging.
- Strict JSON from AI responses to keep UI deterministic.
- Accessibility AA compliance across dashboards and studios.
- Comprehensive error states with upgrade CTAs where relevant.
- Auto-reel rendering completes within SLA (target < 4 minutes per batch) with status updates.

---

## 🧾 Software Requirements Specification (SRS)

### 1. System Context
- **Frontend:** Next.js (App Router), TypeScript, Tailwind.
- **Backend:** Next.js API routes on Vercel edge/serverless runtime.
- **Database/Auth:** Supabase Postgres + Supabase Auth.
- **AI:** Google Gemini (text, repurpose, storyboard).
- **Design:** Canva share links/embeds via config.
- **Billing:** Stripe Checkout + Webhooks.
- **Rendering:** Managed video editing API (Shotstack or equivalent) invoked server-side.

### 2. User Classes
| Class | Description | Access |
| --- | --- | --- |
| Visitor | Unauthenticated user browsing marketing site | Landing only |
| Free User | Authenticated, limited runs, Text Studio access | Text Studio, partial dashboards |
| Premium User | Paying subscriber | All studios, saved projects, Canva handoffs |
| Operator | Internal admin (via dashboards or SQL) | Supabase/Stripe consoles |

### 3. Functional Requirements (Abbreviated IDs)
- **FR-Auth:** Secure signup/login/logout, session retrieval per request.
- **FR-Plan:** Middleware/helper to fetch `users.plan`, enforce feature access.
- **FR-Text:** `POST /api/text/generate` returns array of labeled variants.
- **FR-Repurpose:** `POST /api/video/repurpose` returns hooks, scripts, captions, summary.
- **FR-Storyboard:** `POST /api/video/storyboard` returns strict `scenes[]`.
- **FR-AutoReels:** `POST /api/video/render-shorts` queues rendering jobs and returns downloadable MP4 assets for Premium users.
- **FR-Billing:** Checkout session creation + webhook plan sync.
- **FR-Usage:** Log every successful AI run with timestamp, feature, user_id.
- **FR-Projects (optional):** CRUD for stored outputs.

### 4. External Interface Requirements
- Responses: `{ success: boolean, data?: T, error?: { code, message } }`.
- Status codes: 200 success, 400 validation, 401 unauthenticated, 402 limit/billing, 500 server.
- All AI/billing operations occur server-side; no client-held secrets.

### 5. Non-Functional Requirements
- Security: HTTPS-only, secrets in env vars, RLS enforced.
- Performance: <5s average response; degrade gracefully with caching or retries.
- Maintainability: Shared helpers in `lib/`; testable, documented modules.
- Scalability: Stateless API routes, Supabase indexing on `usage_logs`, `subscriptions`.

---

## 🏗 System Architecture Overview

### 1. Conceptual Diagram
`Client → Next.js App Router (UI) → Next.js API Routes (serverless) → {Supabase, Gemini, Stripe} → Canva (via configured URLs)`.

### 2. Key Components
- **UI Shell:** Landing, dashboard, studios, billing surfaces.
- **Serverless Routes:** One per feature under `app/api/**/route.ts`.
- **Wrappers:** `lib/gemini`, `lib/stripe`, `lib/supabase`, `lib/limits`, `lib/config`.
- **Data Layer:** Supabase tables for users, subscriptions, usage logs, projects, optional Canva templates.

### 3. Flow Summaries
1. **Text Generation:** Form → `/api/text/generate` → plan check → Gemini → usage log → cards.
2. **Video Repurpose:** Transcript/URL → `/api/video/repurpose` → premium enforcement → structured bundle → tabs + “Send to Storyboard”.
3. **Storyboard:** Script → `/api/video/storyboard` → JSON validation → scenes view + Canva CTA.
4. **Auto Reels Rendering:** YouTube URL → `/api/video/render-shorts` → highlight detection + rendering service → storage → downloadable MP4s for Premium.
5. **Billing:** Upgrade CTA → `/api/billing/create-checkout-session` → Stripe → webhook → plan switch + UI refresh.

### 4. Guardrails
- One helper per integration; no direct Stripe/Gemini calls in components.
- All prompts yield typed JSON, parsed centrally before returning to UI.
- Update docs before adjusting architecture or feature scope.

---

## 🗄 Database Design (Supabase/Postgres)

### 1. Mandatory Tables
| Table | Purpose | Key Columns |
| --- | --- | --- |
| `users` | Profile + plan | `id`, `email`, `name`, `plan`, timestamps |
| `subscriptions` | Stripe mirror | `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end` |
| `usage_logs` | Metering | `user_id`, `feature`, `tokens_used?`, timestamps |
| `projects` *(optional)* | Saved outputs | `user_id`, `type`, `title`, `input`, `output`, timestamps |

### 2. Optional Tables
- `project_items`: individual hooks/scripts for finer analytics.
- `canva_templates`: mapping of storyboard format → template URL.
- `audit_logs`: critical events for debugging (login, upgrade, errors).

### 3. Policies & Indexes
- Enable RLS: users only access their rows.
- Index `usage_logs` on (`user_id`, `created_at`).
- `plan` column has CHECK constraint `IN ('free','pro')`.

### 4. Typical Queries
- Fetch plan: `SELECT plan FROM users WHERE id = $1`.
- Count usage: `SELECT COUNT(*) FROM usage_logs WHERE user_id = $1 AND created_at > now() - interval '1 day'`.
- Insert usage: `INSERT INTO usage_logs (user_id, feature) VALUES ($1, $2)`.
- Recent projects: `SELECT ... ORDER BY created_at DESC LIMIT 10`.

---

## 🔀 Data Flow & API Reference

### 1. Global Conventions
- Paths: `/api/<domain>/<action>` with App Router routes.
- Request/response bodies in JSON; UTF-8.
- Authentication resolved server-side per request.

### 2. Endpoint Contracts (Highlights)
1. `GET /api/user/me` → returns `{ id, email, name, plan }`.
2. `POST /api/text/generate`
   ```json
   {
     "type": "caption",
     "topic": "Launch a premium AI studio",
     "tone": "bold",
     "audience": "growth marketers",
     "platform": "instagram"
   }
   ```
   Response data: `{ "variants": [{ "label": "Option 1", "platform": "instagram", "text": "..."}] }`
3. `POST /api/video/repurpose`
   - Enforces Premium plan.
   - Response fields: `hooks[]`, `short_scripts[]`, `captions[]`, `summary_script`.
4. `POST /api/video/storyboard`
   - Input: `{ script, format }`
   - Response: `{ "scenes": [{ "index": 1, "time": "0-3s", "visual": "...", "textOverlay": "...", "voiceover": "...", "note": "" }] }`
5. `POST /api/billing/create-checkout-session`
   - Returns `{ url }` for Stripe redirect.
6. `POST /api/billing/webhook`
   - Verifies signature, updates `subscriptions`, toggles `users.plan`.
7. `POST /api/video/render-shorts`
   - Input: `{ youtubeUrl, clipsRequested, stylePreset }`
   - Response: `{ "jobId": "uuid", "status": "queued", "clips": [] }`
   - Premium-only; queues rendering tasks and logs cost estimates.
8. `GET /api/video/render-shorts/[jobId]`
   - Returns job status plus array of downloadable MP4 URLs once complete.

### 3. Error Codes
| Code | Meaning | UI Action |
| --- | --- | --- |
| `UNAUTHORIZED` | No session | Redirect/login |
| `LIMIT_REACHED` | Free quota exceeded | Show upgrade CTA |
| `BILLING_REQUIRED` | Premium-only path | Modal with benefits |
| `INVALID_INPUT` | Validation failure | Inline form errors |
| `INTERNAL_ERROR` | Unexpected failure | Retry + contact support |

---

## 🔒 Data Security & Privacy Summary

1. **Philosophy:** Minimal data retention, transparent usage, no resale of user content.
2. **Sensitive Data Handling**
   - Auth & profiles: Supabase (encrypted at rest).
   - Billing data: Stripe (Studio 24 stores IDs/status only).
   - Prompts/outputs: Stored only if user saves project; otherwise transient.
3. **Access Controls**
   - Supabase RLS ensures user isolation.
   - Serverless routes verify session + plan before processing.
   - Admin access limited to founders via Supabase/Stripe dashboards.
4. **Logging & Monitoring**
   - Vercel function logs (no prompt contents).
   - Supabase query insights for policy hits.
   - Stripe events dashboard for billing failures.
5. **Incident Response (MVP)**
   - Detect → contain → assess → notify (≤72h) → rotate secrets → document.

---

## ⚙️ Deployment & DevOps Guide

### 1. Environment Strategy
| Environment | Description | Branch |
| --- | --- | --- |
| Production | Customer-facing | `main` |
| Preview/Staging | QA per PR | Vercel previews |
| Local | Developer/Cursor runs | feature branches |

### 2. Required Environment Variables
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `RENDERING_API_KEY`, `RENDERING_WEBHOOK_SECRET` (if supported), `AUTH_SECRET/NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`.

### 3. Deployment Steps
1. Configure Supabase project, apply schema, enable RLS.
2. Configure Stripe product/price, set webhook to `/api/billing/webhook`, store secrets.
3. Configure rendering provider (Shotstack or equivalent): create template(s), set webhook/polling credentials, whitelist callback URL.
4. Seed Canva template URLs in `lib/config.ts` or DB.
5. Import project into Vercel; set env vars; enable automatic deploys.
6. Run smoke tests:
   - Sign up/login.
   - Generate text until limit triggers.
   - Run Stripe CLI `checkout.session.completed`.
   - Generate repurpose + storyboard flows as Premium.
   - Submit auto reels job and confirm MP4 downloads gated to Premium.

### 4. Operational Checklist
- Monitor Vercel logs post-deploy.
- Audit Supabase usage log growth weekly.
- Validate Stripe billing events with each release.
- Maintain README onboarding instructions aligned with this dossier.

---

## 🧠 Development Prompt Guide (Cursor & Collaborators)

### 1. Default Prompt Context
```
You are contributing to Studio 24, a premium social content studio built with Next.js, Supabase, Stripe, Gemini, Canva handoffs, and a managed video rendering API. All sensitive logic lives in server routes. Keep outputs structured (JSON) so UI rendering stays deterministic, and invoke renders only through `lib/video-renderer`. Follow docs in /docs for strategy and architecture.
```

### 2. Feature Prompt Template
```
Goal: <clear objective>
Inputs: <expected fields and validation rules>
Outputs: <response shape>
Plan Gating: <free vs premium expectations>
Acceptance Criteria:
1. API contract implemented under /api/...
2. UI built/updated in app/studio/... with loading/error states.
3. Usage logged; limits enforced.
4. Upgrade messaging shown when applicable.
5. Rendering workloads (if any) delegated to `lib/video-renderer` with download URLs gated to Premium plans.
```

### 3. Testing Checklist
- Generate sample prompts for each studio.
- Hit Free plan limit and verify upgrade CTA path.
- Trigger Stripe webhook via CLI.
- Confirm Premium flow: transcript → repurpose → storyboard → Canva.
- Submit an auto reels job from a YouTube link and verify multiple MP4 downloads with correct overlays remain Premium-only.
- Ensure error states (Gemini failure, invalid inputs) display gracefully.

### 4. Collaboration Norms
- Branch per roadmap phase; avoid multi-phase PRs.
- Update documentation when behavior changes (start with this dossier).
- Use meaningful commit prefixes: `feat`, `fix`, `chore`, `docs`.
- Prefer reusable hooks/components after second usage.

---

## Change Management
- Any divergence from this dossier must be captured here and in companion docs (`overview.md`, `architecture-summary.md`, `development-playbook.md`, `implementation-roadmap.md`) before merging code.
- Maintain version history (simple changelog section below).

### Changelog
- **2025-11-08:** Premium-oriented rewrite aligning all docs with social media marketing focus, USD monetization, and structured workflows.

---

**Remember:** We sell outcomes, not features. Every commit should move creators from *idea* to *publishable content* faster, with the polish expected from a premium USD subscription.

