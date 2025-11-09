# Studio 24 · Implementation Roadmap
<!-- markdownlint-disable MD024 -->

This roadmap turns the Studio 24 vision into a focused build plan. Move through the phases in order, treating earlier phases as prerequisites for the ones that follow. Revisit `docs/overview.md`, `docs/architecture-summary.md`, and `docs/development-playbook.md` before kicking off any phase to keep strategy, architecture, and execution aligned.

---

## Phase 0 · Foundation & Alignment

### Objective

Establish clarity on positioning, technical guardrails, and success criteria so every contributor builds toward the premium social content mandate.

### Scope

- Finalize messaging in landing copy, README, and product surfaces to reflect the premium Studio 24 pitch.
- Confirm environment variable inventory and secrets management across local, preview, and production environments.
- Seed Supabase schema: `users`, `subscriptions`, `usage_logs`, optional `projects`.
- Document Gemini prompt patterns, tone guidelines, and JSON response expectations in `lib/gemini.ts`.

### Done Criteria

<!-- - All docs in `/docs` reflect current positioning and are linked from README.
- Supabase migrations applied; RLS enabled for user-owned tables.
- Local dev environment can authenticate via Supabase and read plan state.
- Gemini helper returns deterministic mock output for local testing. -->

---

## Phase 1 · Landing & Activation Funnel

### Objective

Convert visitors by promising (and previewing) the multi-platform content engine while nudging toward signup.

### Scope

- Refresh landing hero, feature grid, testimonials/placeholders, and pricing CTAs in `app/page.tsx` (or equivalent).
- Add social-proof highlights focused on creators and agencies paying in USD.
- Implement marketing analytics hooks (optional) to capture conversion metrics.

### Done Criteria

- Landing page communicates new tagline and value prop verbatim from `overview.md`.
- Primary CTA routes to sign up/login; secondary CTA previews studios.
- Mobile and desktop breakpoints reviewed; Lighthouse accessibility score ≥ 90.

### Phase 1 Status

- 2025-11-08: Landing page fully reauthored with Studio 24 hero, feature grid, proof strip, workflow explainer, pricing teaser, FAQ, and CTA funnel; SEO headings verified across breakpoints.
- Next: Wire up social proof logos/video assets and add analytics instrumentation (conversion events, scroll depth).
- 2025-11-08: Phase 0 foundations complete (README, environment reference, schema/migration, Gemini prompt contracts).

---

## Phase 2 · Text Studio (Free Plan Anchor)

### Objective

Deliver the first “idea → content” loop for Free users and establish the usage metering infrastructure.

### Backend Tasks

- Implement `POST /api/text/generate` with Zod validation, plan enforcement (`lib/limits`), Gemini wrapper usage, and usage logging.
- Ensure responses provide labeled variants, metadata (tone/platform), and error codes that map to UI states.
- Add unit tests or integration checks for limit enforcement and error handling.

### Frontend Tasks

- Build `app/studio/text/page.tsx` with input controls (content type, topic, tone, audience).
- Render variant cards with copy buttons, platform tags, and “Save to project” (Premium-gated but with CTA for Free).
- Surface limit warnings, upgrade prompts, and fallback messaging when Gemini fails.

### Done Criteria

- Free users capped at 10 generations/24h with clear UI feedback.
- Premium users (flagged manually until billing arrives) skip limits.
- Telemetry captured: request count, failure reasons, upgrade clicks.

### Phase 2 Plan of Record

- ✅ Implement plan-aware limit helper (`lib/limits.ts`) with Free daily quota and logging helpers.
- ✅ Update data access layer to expose per-user plan + usage counts; ensure migrations reflect new tables/indexes.
- ✅ Build `/api/text/generate` with Zod, Gemini invocation, structured success/error responses, and usage logging.
- ✅ Create Text Studio UI (`app/(dashboard)/studio/text/page.tsx`) with input controls, variant cards, copy/save CTA, and upgrade messaging.
- ⬜ Document behaviour (limits doc, README quick links) and add QA notes; update roadmap status when complete.

### Phase 2 Status

- 2025-11-08: `/api/text/generate` live with limit enforcement, Gemini integration (mock fallback), structured error codes, and usage logging.
- 2025-11-08: Text Studio UI published under `/studio/text` with tone/content selectors, guidance, and upgrade hooks.

---

## Phase 3 · Billing & Plan Gating

### Objective

Monetize the text workflow and prepare infrastructure for Premium-only studios.

### Scope

- Integrate Stripe Checkout via `POST /api/billing/create-checkout-session` and `POST /api/billing/webhook`.
- Update `users.plan` and `subscriptions` tables on webhook events; handle cancellations and trials.
- Add plan-aware middleware or helper to gate routes (`/studio/storyboard`, `/studio/video-repurpose`).
- Display plan status, usage meters, and upgrade CTAs on dashboard and within studios.

### Done Criteria

- Successful Stripe checkout flips plan to `pro` instantly after webhook.
- Downgrade or cancellation returns plan to `free` on next webhook event.
- Dashboard shows current plan, remaining Free credits, and CTA for upgrade.
- Billing errors logged and surfaced with user-friendly messaging.

---

## Phase 4 · Video Repurpose Studio (Premium Differentiator)

### Objective

Create the signature “long-form to social snippet” workflow that sells the Premium plan.

### Backend Tasks

- Build `POST /api/video/repurpose` with transcript validation, optional YouTube fetcher, plan enforcement (Premium), Gemini prompt for hooks/shorts/captions/summary, and usage logging.
- Introduce config for maximum transcript length and cost control.

### Frontend Tasks

- Implement `app/studio/video-repurpose/page.tsx` with inputs for transcript/URL, repurpose style, and target platforms.
- Render tabbed output (Hooks, Shorts Scripts, Captions, Summary) with copy actions and inline analytics (word count, estimated runtime).
- Add “Send to Storyboard” action that populates Phase 5 flow.

### Done Criteria

- Premium users receive complete repurpose bundles in <10 seconds median.
- Free users see gated messaging with sample output teaser and upgrade CTA.
- Usage logs differentiate `video_repurpose` feature for analytics.
- Error handling covers malformed transcripts, Gemini failures, and plan gating.

### Phase 4 Status

- 2025-11-08: `/api/video/repurpose` live with Premium gating, transcript validation, Gemini integration, structured JSON parsing, and usage logging.
- 2025-11-08: Video Repurpose Studio UI published with transcript ingestion, tone + platform controls, result cards (hooks, scripts, captions, summary), copy CTAs, and Premium teaser for Free users.
- Next: wire “Send to Storyboard” CTA once Phase 5 ships, and explore optional YouTube transcript fetch helper.

---

## Phase 5 · Storyboard Studio & Canva Bridge

### Objective

Close the loop from script to visual execution so Premium customers can export without leaving the flow.

### Backend Tasks

- Extend `lib/gemini.ts` for storyboard prompts returning strict `scenes[]` JSON with validation and retry safety.
- Implement `POST /api/video/storyboard` restricted to Premium, with usage logging and structured error codes.
- Maintain Canva template mapping in `lib/canva/config.ts` or `canva_templates` table.

### Frontend Tasks

- Build `app/studio/storyboard/page.tsx` rendering scene timeline, text/JSON copy buttons, and “Open in Canva” CTA.
- Support deep-linking from Video Repurpose results (pre-filled scripts).
- Provide Premium upsell for Free users attempting to access Storyboard Studio.

### Done Criteria

- End-to-end Premium flow: transcript → repurpose → storyboard → Canva template link.
- Scene output validates against schema; invalid AI responses trigger retries or graceful degradation.
- Canva link usage tracked (manual analytics or event logging).

### Phase 5 Status

- 2025-11-08: `generateStoryboardOutput` implemented with Gemini schema coercion, Canva template slugs, and robust fallbacks.
- 2025-11-08: `/api/video/storyboard` shipping with Premium gating, usage logging, and informative errors.
- 2025-11-08: Storyboard Studio UI live under `/studio/storyboard` with scene timeline, copy actions, Canva CTA, and Free-plan teaser.
- 2025-11-08: Canva OAuth bridge + embedded Create SDK live; `/api/video/storyboard/design` stores Canva design metadata and usage logs track connect/save events.
- Next: add deep-link from Video Repurpose results, capture Canva template analytics, and surface saved storyboard history.

---

## Phase 6 · Auto Reels Rendering

### Objective

Transform YouTube videos into multiple premium short-form exports with captions, animations, and speaker-aware cropping for Premium users.

### Backend Tasks

- Replace third-party renderer calls with self-hosted FFmpeg pipeline (`lib/video-renderer/**` utilities + `scripts/auto-reel-worker.ts`).
- Build `/api/video/render-shorts` (Premium-only) to:
  - Fetch YouTube metadata/transcript (existing helper or new extractor).
  - Use Gemini to suggest highlight segments, captions, and overlay text.
  - Persist jobs in `auto_reel_jobs` with plan + render config.
  - Rely on the worker to poll queued jobs, render MP4s into `temp/auto-reels/`, and update status.
- Add download endpoint streaming the rendered MP4 from disk with auth gating.
- Track retries, progress, and worker IDs in the DB for observability.

### Frontend Tasks

- Add `app/studio/auto-reels/page.tsx` (or integrate within Video Repurpose Studio) enabling:
  - YouTube URL input, highlight configuration (e.g., number of shorts, duration, style presets).
  - Job status dashboard with progress indicators, retry, and cancel options.
  - Download buttons gated to Premium users; show preview thumbnails.
- Update Video Repurpose Studio to deep-link into Auto Reels for generated segments.
- Surface upgrade messaging for Free users attempting to initiate renders.

### Done Criteria

- Premium users can generate ≥3 shorts per YouTube video; output includes text overlays, auto-captions, and motion graphics consistent with brand presets.
- Rendered videos stored in managed temp dir, streamed through authenticated API endpoint, and cleaned up on schedule.
- Speaker-aware cropping performs accurately for typical podcast/talking-head scenarios (document limitations).
- Cost per render stays within configured margin thresholds.

### Phase 6 Status

- 2025-11-08: `auto_reel_jobs` table, FFmpeg-powered worker, and `/api/video/render-shorts` live with Premium gating, Gemini highlight planning, and usage logging.
- 2025-11-08: Auto Reels Studio UI shipping with YouTube intake, highlight configuration, progress dashboard, retry controls, and authenticated downloads.
- Next: add automated cleanup of stale `temp/auto-reels` files, speaker-aware cropping presets, and deep-link Video Repurpose segments directly into Auto Reels.

---

## Phase 7 · Dashboard Revamp & Polishing

### Objective

Present Studio 24 as a premium command center that surfaces value, usage, and upsell opportunities.

### Scope

- Redesign `/dashboard` with quick-launch cards for each studio, recent generations, usage meters, plan status, and testimonials.
- Integrate saved projects (if `projects` table populated) with filters for Text/Video/Storyboard.
- Ensure auth middleware, plan gating, and Stripe upgrade flow align with new layout.
- Add contextual education (“How agencies use Studio 24”, “Launch faster on Reels”) to drive engagement.

### Done Criteria

- Dashboard loads in <2 seconds and highlights the next best action for both Free and Premium users.
- Usage meters, plan badges, and upgrade CTAs are consistent across dashboard and studios.
- Saved projects display correctly with pagination or lazy loading.

---

## Phase 8 · QA, Compliance, and Launch Readiness

### Objective

Validate the product end-to-end, ensure operational excellence, and document setup for future contributors.

### Tasks

- Execute QA prompts from `docs/development-playbook.md` across Free and Premium personas.
- Test Stripe scenarios with CLI: checkout completed, subscription updated, subscription canceled.
- Validate Supabase RLS policies and ensure no PII leaks in logs.
- Document environment variables, deployment steps, and rollback plan in README/`docs`.
- Run accessibility checks (axe/Lighthouse) and responsive audits for critical screens.

### Launch Criteria

- All studios functional with clean error handling for both plan tiers.
- Vercel production deployment configured with required secrets and monitoring alerts.
- Gemini, Supabase, Stripe limits tested under load equivalent to launch expectations.
- Support documentation ready: onboarding emails, upgrade nudges, troubleshooting FAQ.

---

## Governance & Change Management

- Any roadmap deviation must be reflected here before code merges to avoid doc/implementation drift.
- Log retro notes at the end of each phase: what shipped, blockers, metrics captured.
- Treat this roadmap as a living artifact; update status indicators, owners, and timelines during weekly reviews.
