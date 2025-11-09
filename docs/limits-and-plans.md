# Usage Limits & Plan Enforcement

Studio 24’s MVP relies on clear, predictable limits so Free users experience the value quickly while Premium customers unlock the full workflow. This page defines the rules enforced by `lib/limits.ts` and referenced across API routes and UI surfaces.

## Plan definitions

- **Free**
  - Daily quota: 10 AI generations across all features (`text`, `video_repurpose`, `storyboard`, `auto_reel`)
  - Access: Text Studio (full output), previews/teasers for other studios
  - `/api/video/repurpose` responds with `BILLING_REQUIRED` plus sample bundle to drive upgrades
  - `/api/video/storyboard` responds with `BILLING_REQUIRED` plus storyboard preview cards
  - Saved projects: not persisted (call to action to upgrade)
- **Pro**
  - Unlimited generations (soft cap configurable in `lib/limits.ts`)
  - Access: all studios, embedded Canva editor with OAuth handoff, saved projects, automated reels rendering

## Feature keys

Use the following feature strings when logging usage or enforcing limits:

| Feature | Description |
| --- | --- |
| `text` | Calls to `/api/text/generate` (Text Studio) |
| `video_repurpose` | Calls to `/api/video/repurpose` |
| `storyboard` | Calls to `/api/video/storyboard` |
| `auto_reel` | Calls to `/api/video/render-shorts` |
| `canva_connect` | Successful Canva OAuth connection via `/api/integrations/canva/callback` |
| `canva_save` | Persisting Canva design metadata via `/api/video/storyboard/design` |

## Enforcement flow

1. API handler resolves the authenticated user via `getUser()`.
2. `lib/limits.ts` checks the user’s plan (`users.plan`) and counts recent `usage_logs`.
3. If the user exceeds their quota, throw `{ code: 'LIMIT_REACHED', message: '...' }`.
4. Otherwise, execute the requested operation and insert a usage log upon success.
5. Client surfaces friendly messaging (e.g., upgrade modal) when encountering `LIMIT_REACHED` or `BILLING_REQUIRED`.

## Extending limits

- To change quotas, update `FREE_DAILY_LIMIT` / `PRO_SOFT_LIMIT` inside `lib/limits.ts`.
- To apply per-feature limits (e.g., Free users get 3 storyboard previews), extend the config map in the same file.
- Always document new limits here and ensure UI copy matches.

## Logging metadata

`usage_logs.metadata` can be used to store lightweight context (e.g., `{ tokenCount: 230, platform: 'linkedin' }`). Keep payloads small (<1 KB) to avoid bloating storage.

Refer to `docs/Hackathon.md` (SRS) for exact API contracts and error codes associated with plan enforcement.

