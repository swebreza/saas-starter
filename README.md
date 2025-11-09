# Studio 24 – AI Campaign Studio

Studio 24 is a premium AI content studio that turns a single idea into publish-ready campaigns across TikTok, Instagram, YouTube Shorts, LinkedIn, X, and more. This repository hosts the Next.js application, Supabase schema, Stripe billing logic, and Gemini orchestration required to deliver the MVP described throughout the `/docs` directory.

> **Quick links**
>
> - 📘 Product strategy: [`docs/overview.md`](docs/overview.md)
> - 🧠 Architecture & development norms: [`docs/architecture-summary.md`](docs/architecture-summary.md), [`docs/development-playbook.md`](docs/development-playbook.md)
> - 🛣️ Delivery roadmap: [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md)
> - 🧪 Strategic dossier (BRD/PRD/SRS): [`docs/Hackathon.md`](docs/Hackathon.md)

## Core capabilities

- **Text Studio** – Gemini-powered hooks, captions, scripts, and outlines structured for instant export.
- **Video Repurpose Studio** – Transcript/URL → shorts playbooks, teaser scripts, caption packs.
- **Storyboard Studio + Canva Bridge** – Scene timelines with embedded Canva editor and one-click template handoffs.
- **Automated Reels Rendering** – Premium users get downloadable, brand-on short-form videos.
- **Usage-aware monetisation** – Free tier proves value; Premium lifts limits, unlocks Canva handoffs, saves projects.

## Tech stack

- **Framework** – Next.js App Router (TypeScript, Tailwind)
- **Database/Auth** – Supabase Postgres + Supabase Auth (Drizzle ORM for schema/migrations)
- **AI** – Google Gemini (text, repurpose, storyboard, rendering prompts)
- **Billing** – Stripe Checkout + Customer Portal
- **Design handoff** – Canva templates maintained in `lib/canva/config.ts`

## Getting started

```bash
git clone https://github.com/nextjs/saas-starter studio-24
cd studio-24
pnpm install
```

Create your `.env.local` from the template and populate the variables described in [`docs/environment.md`](docs/environment.md):

```bash
cp .env.example .env.local
```

Run database migrations and seed data required for local development:

```bash
pnpm db:migrate
pnpm db:seed
```

Boot the app:

```bash
pnpm dev
```

Launch the Auto Reels worker in a second terminal to render reels locally:

```bash
pnpm auto-reel:worker
```

Rendered files land in `temp/auto-reels/<jobId>/result.mp4` and stream through the Auto Reels Studio download button once a job completes.

Navigate to [http://localhost:3000](http://localhost:3000) to explore the marketing site and `/sign-up` to create a local account.

> Prefer Supabase? Export your Supabase connection string as `POSTGRES_URL` and supply the anon/service-role keys in `.env.local`. Drizzle migrations will run against the configured database.

> **Canva setup**: After registering the Studio 24 app in the Canva Developer Portal, set `NEXT_PUBLIC_CANVA_APP_ID`, `CANVA_CLIENT_SECRET`, and `CANVA_REDIRECT_URI` in `.env.local`. The embed loader pulls from `NEXT_PUBLIC_CANVA_CREATE_SDK_URL`, which defaults to Canva’s CDN. Update it if you host a custom bundle.

## Development workflow

1. Revisit the documents listed above before starting any work to stay aligned with product and architectural guardrails.
2. Implement the feature following the patterns codified in `docs/development-playbook.md`.
3. Add or update migrations in `lib/db/migrations` when schema changes are required.
4. Keep `/docs` as the source of truth—if behaviour changes, update the relevant doc before (or alongside) the code.

For automated local setup (Docker Postgres, Stripe CLI login, env file scaffold), run:

```bash
pnpm db:setup
```

Follow the prompts to provision local dependencies and generate `.env`.

## Deploying

The application is designed for Vercel + Supabase:

1. Mirror the environment variables documented in [`docs/environment.md`](docs/environment.md) for preview/production.
2. Configure Supabase (schema, RLS policies) and Stripe (product, price, webhook) using the instructions in `docs/Hackathon.md`.
3. Deploy to Vercel and verify the smoke tests detailed in `docs/implementation-roadmap.md` Phase 8.

## Contributing

Open a PR with a concise summary, link to the relevant roadmap phase or doc section, and include any migration or environment updates. Keep branches scoped to a single roadmap slice (see `docs/implementation-roadmap.md` for guidance).
