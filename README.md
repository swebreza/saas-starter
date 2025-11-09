# Studio 24 – Creator Automation Platform

Studio 24 helps creators, agencies, and growth teams launch multi-channel campaigns from one command center. The platform combines AI copywriting (Gemini), visual automation (Canva + Remotion Worker), and workflow orchestration (n8n) to deliver schedules, assets, and analytics without manual busywork.

---

## Quick Links
- 📘 Product overview → [`docs/overview.md`](docs/overview.md)
- 🏗️ Architecture summary → [`docs/architecture-summary.md`](docs/architecture-summary.md)
- 🔍 Detailed architecture & data model → [`docs/detailed-architecture.md`](docs/detailed-architecture.md)
- ⚙️ Environment setup → [`docs/environment.md`](docs/environment.md)
- 🚦 Roadmap → [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md)
- 🧭 Development playbook → [`docs/development-playbook.md`](docs/development-playbook.md)
- 🔄 Automation workflows → [`docs/n8n.md`](docs/n8n.md)

---

## Core Value
- **Campaign Launchpad** – Capture a campaign brief and get AI-generated concepts, hooks, scripts, and asset recommendations.
- **Visual Production** – Personalise Canva templates and auto-render clips with Remotion Worker or fallback pipeline.
- **Scheduling & Publishing** – n8n workflows queue posts across Instagram, TikTok, YouTube, LinkedIn, X, and more.
- **Analytics Hub** – Pull post-level metrics, generate insights, and export client-ready reports.
- **Monetisation** – Plan-aware quotas, metered add-ons, and Stripe billing for Free → Pro → Agency ladder.

---

## Tech Stack
- **Frontend**: Next.js App Router (TypeScript, Tailwind, ShadCN)
- **Automation**: n8n (self-hosted) orchestrating campaign, asset, scheduling, analytics workflows
- **AI**: Google Gemini for copy/insights
- **Media**: Canva Create APIs, Remotion Worker (or fallback FFmpeg/Shotstack)
- **Data**: Supabase (Postgres + Auth + Storage), Drizzle ORM migrations
- **Billing**: Stripe Checkout, Billing Portal, metered usage
- **Observability**: Sentry/Logflare (TBD), Supabase logs, n8n execution history

---

## Getting Started (Local)
```bash
git clone https://github.com/nextjs/saas-starter studio-24
cd studio-24
pnpm install
cp .env.example .env.local        # fill values from docs/environment.md
pnpm db:migrate
pnpm db:seed                      # optional seed script
pnpm dev
```

Optional:
- Run Supabase locally (`supabase start`) or point to staging Supabase.
- Spin up n8n locally with `docker compose -f docker-compose.n8n.yml up`.

Visit [http://localhost:3000](http://localhost:3000) to explore the marketing site and sign up.

> Keep `.env.local` secret. All required variables and service setup steps live in `docs/environment.md`.

---

## Project Structure (High Level)
```
app/                # Marketing site, dashboard, studios, settings
components/         # UI primitives and feature components
lib/                # Auth, Supabase helpers, integrations, workflow utilities
workflows/n8n/      # Version-controlled n8n workflow JSON
docs/               # Living documentation set
scripts/            # CLI utilities (seed, env reset, workflow deploy)
```
Refer to `docs/detailed-architecture.md` for full breakdown.

---

## Development Workflow
1. **Read** the relevant docs (overview, architecture, playbook, roadmap).
2. **Update documentation** first when the design changes.
3. **Build** on a feature branch (`feature/<slug>`). Keep PRs focused (<500 LOC when possible).
4. **Test** (unit, integration, workflow, e2e) per `docs/development-playbook.md`.
5. **Version-control** n8n workflows (`workflows/n8n/*.json`) and include diffs in PRs.
6. **Deploy** merges via Vercel + Supabase migrations + workflow promotion pipeline.

Observability (Sentry/logging) must be checked after each deploy; failed automation runs require immediate triage.

---

## Environments
- `local` – Optional Supabase/n8n via Docker; `MOCK_GEMINI=true` available.
- `staging` – Dedicated Supabase project, staging n8n instance, Stripe test mode.
- `production` – Separate Supabase, n8n, Stripe live credentials, monitored 24/7.

Environment variables, secrets management, and integration checklists live in [`docs/environment.md`](docs/environment.md).

---

## Roadmap Snapshot
| Phase | Focus |
| --- | --- |
| 0 | Research & context reset |
| 1 | Documentation foundation |
| 2 | Platform architecture & tooling |
| 3 | Automation backbone (n8n) |
| 4 | Product experience (UI, content engine, analytics) |
| 5 | Monetisation, QA, launch readiness |

Status and acceptance criteria for each phase are tracked in [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md).

---

## Contributing
- Follow the standards described in `docs/development-playbook.md`.
- Reference the relevant doc sections in PR descriptions.
- Include migrations, workflow JSON, and screenshots/recordings as appropriate.
- Keep docs, code, and automation assets in sync.

---

## Support & Communication
- Prefer issues/PRs tied to roadmap milestones.
- Log significant decisions in `docs/decisions/` (create file if needed).
- Use changelog/releases to communicate externally once we approach launch.

Studio 24 is documentation-driven—always update the docs first, then ship code.***

