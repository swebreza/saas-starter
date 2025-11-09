## Development Playbook · Studio 24

This playbook keeps every contributor—human or AI—building the same premium-grade Studio 24 experience. Treat it as the contract between product vision, architecture, and day-to-day implementation.

### Operating Principles
- **Boring Stack, Bold Output**: Stay inside the sanctioned stack—Next.js App Router, Supabase, Stripe, Gemini, Canva, Vercel. Differentiation comes from workflow polish, not flashy infra.
- **Server-Orchestrated Intelligence**: All logic that touches Gemini, Stripe, Supabase, or the rendering service lives in server routes. Components are presentation-only and consume typed responses.
- **Structured Responses Everywhere**: API routes return `{ success, data?, error? }`. Gemini prompts must yield parseable JSON to keep UI deterministic.
- **Usage Logged or It Didn’t Happen**: Each successful AI generation writes to `usage_logs`. Limits, analytics, and billing assumptions rely on accurate telemetry.
- **Docs First, Code Second**: Any strategic shift bubbles up here (and in `overview.md` / `architecture-summary.md`) before code changes land.

### Standard Delivery Workflow
1. **Re-align Context**  
   - Re-read `docs/overview.md` for positioning, `docs/architecture-summary.md` for tech boundaries, and the relevant phase in `docs/implementation-roadmap.md`.
   - Confirm whether the task targets Free, Premium, or both plans.
2. **Shape the Contract**  
   - Define request/response schema using Zod in the API route.  
   - Identify which Gemini helper (text, repurpose, storyboard) needs updates or extensions.
   - Update `lib/limits.ts` if quotas or gating change.
3. **Implement the API Route** (`app/api/.../route.ts`)  
   - Resolve auth + user plan via `lib/auth` / Supabase server client.  
   - Enforce plan limits with `lib/limits`.  
   - Call Gemini/Stripe/rendering services through wrappers only.  
   - Sanitize and return structured data; log usage or raise standardized errors.
4. **Build/Update the UI** (`app/studio/...`, `components/ui`)  
   - Consume the typed API contract.  
   - Provide clear loading, error, and upgrade states.  
   - Include copy/export actions and Canva handoffs where relevant.  
   - For Canva embeds, check `user.canvaConnected` from `/api/user`, route connect flows through `/api/integrations/canva/**`, and surface save controls that POST to `/api/video/storyboard/design`.
   - Keep Tailwind classes lean; share components when patterns repeat.
5. **Test & Validate**  
   - Run local end-to-end flows using representative prompts/transcripts.  
   - Verify limit enforcement: Free plan should fail gracefully after threshold; Premium should not.  
   - Trigger Stripe webhooks via CLI for billing-related work.  
   - Capture any new prompts or edge cases in `docs/Hackathon.md` if reusable.
6. **Document & Ship**  
   - Update README or relevant docs when setup or behavior changes.  
   - Use meaningful commit messages (`feat`, `fix`, `chore`, etc.).  
   - Ensure Vercel environment variables are accounted for before merging.

### Rapid QA Scenarios
- **Text Studio**: “Draft teaser hooks for a fintech founder on LinkedIn” → expect 3+ variant cards with copy buttons and tone adherence. Toggle `MOCK_GEMINI=true` locally for deterministic outputs when testing UI changes.
- **Video Repurpose**: Paste a 2-minute transcript → confirm hooks, short scripts (with runtime), captions, and summary render; Free plans should see Premium teaser + sample bundle, while Pro runs return structured JSON.
- **Storyboard Studio**: Paste a 60–90s script → verify timeline cards (visual/overlay/voiceover/note), Canva CTA link, JSON copy, and Premium gating for Free users.
- **Canva Bridge**: Connect Canva via `/api/integrations/canva/authorize`, confirm Create SDK loads in `/studio/storyboard`, save a design, and ensure `/api/video/storyboard/design` persists metadata.
- **Auto Reels**: Submit a YouTube URL, run `pnpm auto-reel:worker` in a second terminal, confirm `/api/video/render-shorts` queues a job, progress updates poll successfully, and the download link streams the MP4.
- **Plan Limits**: Execute 11 Free-plan generations in 24h → expect `{ success: false, error.code: "LIMIT_REACHED" }` and upgrade CTA surfaced in UI.
- **Auto Reels Rendering**: Allow the worker to finish, then watch the MP4 for hook overlay placement, pacing, and correct CTA text; verify Free plans cannot access downloads.
- **Billing Flow**: Run `stripe trigger checkout.session.completed` → ensure `users.plan` flips to `pro`, dashboard and studios unlock Premium features.

### Pitfalls to Avoid
- Triggering Gemini/Stripe/rendering services/DB from the client; all sensitive calls must remain server-side.
- Skipping input validation, leading to unpredictable Gemini outputs or security gaps.
- Logging entire prompts or secrets—store only metadata necessary for debugging.
- Hardcoding Canva URLs inside components; centralize in `lib/canva/config.ts` or the `canva_templates` table.
- Bypassing Canva OAuth helpers (`lib/canva/oauth.ts`). Always use `/api/integrations/canva/*` so tokens persist and refresh correctly.
- Ignoring error branches; every API route must map failures to user-friendly messaging.
- Promoting builds with `MOCK_GEMINI` enabled—double-check production envs rely on real Gemini credentials.

### Collaboration Expectations
- Keep branches focused on single roadmap items. Surface blockers early with context and proposed solutions.
- If a decision deviates from the roadmap or docs, annotate why in PR descriptions and update documentation immediately after merge.
- Favor reusable utilities and hooks; any UI pattern repeated twice deserves a shared component. Share video download components across studios to keep Premium gating consistent.
- When handing off work to Cursor/other AI, include explicit acceptance criteria mirroring this playbook.

