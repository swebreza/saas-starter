# Studio 24 Environment Reference

Use this checklist whenever you spin up a new environment (local, preview, or production). Secrets should live in platform-specific secret managers (Vercel, Supabase, Stripe)―never hard-code them in the repo.

| Variable | Required | Description | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL of the web app | Used by client-side routes and metadata |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL | Provided by Supabase dashboard |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon key | Client-safe; required for browser auth helpers |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key | **Server-only**; enables RLS migrations and background jobs |
| `POSTGRES_URL` | ✅ | Connection string for Drizzle migrations | Use Supabase `postgres` connection or local Postgres |
| `AUTH_SECRET` | ✅ | Secret for JWT session signing | Generate with `openssl rand -base64 32` |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key | Required for all AI studios |
| `GEMINI_MODEL` | ⭕️ | Override the default Gemini model name | Defaults to `gemini-1.5-pro-latest` |
| `MOCK_GEMINI` | ⭕️ | When set to `true`, returns deterministic mock data | Helpful for local development without API costs |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret API key | Use test key locally/preview; live key in production |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Signing secret for `/api/stripe/webhook` | Unique per environment |
| `STRIPE_PRICE_ID_PRO` | ✅ | Price ID for Premium plan | Create in Stripe dashboard |
| `NEXT_PUBLIC_CANVA_APP_ID` | ✅ | Canva Create SDK app identifier | Provided in Canva Developer dashboard; required to launch embedded editor |
| `CANVA_CLIENT_SECRET` | ✅ | Server-side secret for Canva OAuth token exchange | Store in Supabase or Vercel secrets; never expose to client |
| `CANVA_REDIRECT_URI` | ✅ | OAuth redirect registered with Canva | Typically `${BASE_URL}/api/integrations/canva/callback` |
| `CANVA_TEMPLATES_CONFIG` | ⭕️ | Optional JSON for overriding default Canva template URLs | Fallbacks live in `lib/canva/config.ts` |
| `CANVA_AUTH_BASE_URL` | ⭕️ | Override Canva OAuth base URL | Defaults to `https://www.canva.com/api/oauth` |
| `CANVA_SCOPES` | ⭕️ | Space-delimited Canva OAuth scopes | Defaults to `openid profile design:read design:write` |
| `NEXT_PUBLIC_CANVA_CREATE_SDK_URL` | ⭕️ | Override for Canva Create SDK script URL | Defaults to Canva-hosted CDN |
| `AUTO_REEL_TEMP_DIR` | ⭕️ | Filesystem folder for rendered reels | Defaults to `<repo>/temp/auto-reels` |
| `AUTO_REEL_FONT_PATH` | ⭕️ | Absolute path to TTF/OTF font for overlays | Defaults to `public/fonts/Inter-SemiBold.ttf` if present |
| `AUTO_REEL_POLL_INTERVAL_MS` | ⭕️ | Worker poll interval | Defaults to `5000` |
| `AUTO_REEL_MAX_RETRIES` | ⭕️ | Maximum automatic retries before failing a job | Defaults to `2` |
| `AUTO_REEL_WORKER_ID` | ⭕️ | Identifier for the Node worker instance | Defaults to `auto-reel-worker-<pid>` |
| `FFMPEG_PATH` | ⭕️ | Override path to ffmpeg binary | Falls back to `@ffmpeg-installer/ffmpeg` binary |
| `BASE_URL` | ✅ (server) | Fully-qualified base URL used in server-side redirects | Set to Vercel URL in production |

> ✅ = Required today  
> ⭕️ = Optional until the corresponding roadmap phase goes live

## Secrets management tips

- **Local development**: store secrets in `.env.local`. Never commit this file. Consider using `direnv` or 1Password CLI for team sharing.
- **Vercel preview/production**: add variables via the Vercel dashboard. Use environment scoping (Preview vs Production) to avoid leaking live keys.
- **Supabase**: restrict service role key usage to serverless functions and background jobs; never expose it to the client.
- **Stripe**: rotate webhook secrets whenever you recreate endpoints. Document the webhook URLs per environment in your team wiki.

For the canonical list of features that rely on each variable, see `docs/Hackathon.md` (SRS → External Interface Requirements) and `docs/implementation-roadmap.md` (phase-specific steps).

## Canva setup checklist

- Register the Studio 24 Canva integration at https://www.canva.dev/ and capture the `appId`, client secret, and redirect URI.
- For local development, use `http://localhost:3000/api/integrations/canva/callback` as the redirect and add `http://localhost:3000` to the allowed origins list.
- When hosting the Create SDK bundle yourself, set Canva’s “Development bundle URL” to `http://localhost:3000/canva/app.js` (or your chosen path) and update `NEXT_PUBLIC_CANVA_CREATE_SDK_URL` if you override the default.
- Add the scopes you request in `CANVA_SCOPES` and ensure they match the integration’s configuration in the Canva developer portal.
- Document all production URLs in the team wiki so the Canva review team can verify the integration.

## Auto reels setup checklist

- (Required) Install local dependencies via `pnpm install` (installs `@ffmpeg-installer/ffmpeg`, `fluent-ffmpeg`, `ytdl-core`).
- Optional: set `AUTO_REEL_TEMP_DIR` if you prefer a different storage directory; otherwise reels live under `temp/auto-reels`.
- Optional: set `AUTO_REEL_FONT_PATH` to point at a brand font for `drawtext` overlays.
- Run the worker locally with `pnpm auto-reel:worker` after starting the Next.js dev server.
- When deploying, provision a lightweight VM/worker (Fly.io, Render, etc.) that can run the polling script and access the same Postgres + storage. Adjust `AUTO_REEL_WORKER_ID` as needed for observability.