## Architecture Summary · Studio 24

### Core Principle
Studio 24 is an AI coordination layer: product value lives in the UX, orchestration, and gating we wrap around best-in-class services. Next.js handles customer experience, while Gemini, Canva, Supabase, and Stripe do the heavy lifting.

### Logical Stack
| Layer | Purpose | Technologies |
| --- | --- | --- |
| Presentation | React UI/UX, auth-aware routing, marketing site | Next.js App Router, TypeScript, Tailwind |
| Application | Validation, plan enforcement, API orchestration | Serverless routes under `app/api/**/route.ts` |
| Integration | Wrappers for vendors, prompt building, telemetry | `lib/gemini`, `lib/stripe`, `lib/supabase`, `lib/limits`, `lib/config`, `lib/video-renderer` |
| Data | Persistence, usage metering, saved projects, plan state | Supabase/Postgres with Row Level Security |

### Critical Components
- **Frontend Shell** (`/app` + `components/ui`): Landing page, dashboard, studios, billing surface. All `/studio/*` routes require authenticated users.
- **API Routes** (`/app/api/**/route.ts`): Each studio has its own POST endpoint responsible for auth verification, plan checks, schema validation, Gemini invocation, and usage logging.
- **Integration Helpers**:
  - `lib/gemini.ts` – typed prompts + parsing for text, repurpose packs, storyboards.
  - `lib/limits.ts` – configurable Free vs Premium quotas and feature gating.
  - `lib/stripe.ts` – checkout session creation, webhook signature verification.
  - `lib/config.ts` – Canva template registry mapped to storyboard formats.
  - `lib/video-renderer.ts` – orchestrates automated short-form renders via Shotstack (or equivalent) and manages download URLs.
- **Data Model**: `users` (plan, profile), `subscriptions` (Stripe mirror), `usage_logs` (per-call metering), optional `projects` + `project_items` for saved outputs.
- **Billing Spine**: Stripe Checkout upgrades, webhooks sync plan state, dashboard reflects status instantly.

### End-to-End Flows
1. **Text Studio**
   - Form submit → `POST /api/text/generate`
   - Server validates, enforces quota via `lib/limits`, calls Gemini `generateText`
   - Usage logged, JSON variants returned for card rendering with copy actions
2. **Video Repurpose Studio**
   - Transcript ingest → `POST /api/video/repurpose`
   - Gemini returns hooks, shorts scripts, captions, summary in strict schema
   - Response populates tabbed interface with “Send to Storyboard” shortcuts
3. **Storyboard Studio**
   - Script payload → `POST /api/video/storyboard`
   - Gemini produces `scenes[]` JSON, server retries on malformed output
   - UI shows scene list, JSON copy, and “Open in Canva” CTA pulled from config
4. **Auto-Reels Rendering (Premium)**
   - YouTube URL → `/api/video/render-shorts`
   - Server resolves transcript + scene highlights (Gemini), computes speaker segments, and assembles render jobs via `lib/video-renderer`
   - Rendering service returns muxed MP4s with captions/animations; stored temporarily (e.g., Supabase storage/S3) and made downloadable for Premium users
   - Usage logged separately for cost tracking; Free users see upgrade CTA
5. **Billing**
   - Upgrade CTA → `POST /api/billing/create-checkout-session`
   - Stripe checkout success → webhook updates `users.plan` and `subscriptions`
   - Premium-only UI instantly available post-webhook; limits lifted by plan

### Non-Functional Expectations
- **Performance**: AI endpoints return within 5 seconds average; implement retries and user-friendly errors for Gemini timeouts.
- **Security**: All secrets confined to Vercel env vars; Supabase RLS ensures row-level isolation; no direct client access to third-party APIs.
- **Cost Discipline**: Default prompts optimized for <$0.01 per text generation; rendering jobs budgeted and logged to keep per-short cost profitable.
- **Reliability**: Zero-ops deployment—push to `main` triggers Vercel build; Supabase handles backups; Stripe manages PCI.

### Execution Guardrails
- Implement features phase-by-phase per `docs/implementation-roadmap.md` to avoid scope creep.
- Validate every material change against this architecture before coding; if direction shifts, update this document first.

