# Canva Integration Guide · Studio 24

This document explains how Studio 24 integrates with Canva. It covers OAuth, API usage, template management, and UI behaviour. Keep it current as the integration evolves.

---

## 1. Goals

- Provide branded, editable visuals for campaigns without leaving Studio 24.
- Allow users to personalise Canva templates (images, short-form videos) seeded with Gemini/Remotion content.
- Track Canva usage for plan enforcement and billing insights.

---

## 2. OAuth & Authentication

1. User clicks “Connect Canva” in settings or during visual workflows.
2. Browser redirected to Canva OAuth with scopes: `openid profile design:read design:write asset:create`.
3. Redirect URI: `${BASE_URL}/api/integrations/canva/callback`.
4. Server exchanges code for tokens; store in Supabase:
   - `workspace_integrations` row (`provider = 'canva'`, `status = 'connected'`).
   - `credentials` row containing encrypted access + refresh tokens and expiration.
5. Refresh tokens via Next.js scheduled job or during API calls (`/api/media/canva/refresh`).
6. OAuth failures logged and surfaced as warnings in Integrations page.

Environment variables:
- `NEXT_PUBLIC_CANVA_APP_ID`
- `CANVA_CLIENT_SECRET`
- `CANVA_REDIRECT_URI`
- Optional overrides: `CANVA_API_BASE_URL`, `CANVA_SCOPES`, `NEXT_PUBLIC_CANVA_CREATE_SDK_URL`

---

## 3. Template Management

### Template Registry
- Stored in Supabase table `canva_templates` or JSON config `lib/canva/templates.ts`.
- Schema: `id`, `workspace_id (nullable)`, `format (story|square|widescreen)`, `use_case`, `template_id`, `thumbnail_url`, `is_active`.
- Seed defaults during onboarding; allow Agency workspaces to upload custom template IDs.

### Template Personalisation
1. User selects concept → app calls `/api/media/canva/template`.
2. API validates plan (`asset_generate` quota), fetches template ID, prepares payload (text placeholders, colour palette).
3. Request to Canva Create API to generate design draft or returns edit link.
4. Response stored in `campaign_assets` with `source = 'canva'`.
5. User opens Canva editor (embedded iframe or new tab) to edit and export.

---

## 4. API Interactions

| Endpoint | Purpose | Notes |
| --- | --- | --- |
| `POST /api/integrations/canva/authorize` | Initiates OAuth flow | Redirect-only |
| `GET /api/integrations/canva/status` | Returns connection state | Used in UI toggles |
| `POST /api/integrations/canva/callback` | Handles OAuth callback | Stores tokens, returns redirect |
| `POST /api/media/canva/template` | Generates personalised design link | Requires Pro+ |
| `POST /api/media/canva/webhook` | (Optional) Receives design save events | Enable if Canva webhook available |

Helper module: `lib/canva/client.ts` wraps REST calls (token refresh, error handling).

Handle rate limits: follow Canva guidance; throttle high-volume automation tasks in n8n.

---

## 5. UI Behaviour

- **Connect State**: display connection card with status badge, last refreshed timestamp, reconnect button.
- **Template Gallery**: show previews, allow filtering by format/use case. Free plan sees locked state with upgrade CTA.
- **Canvas Embed** (optional): Use Canva Create SDK if inline editing is desired. Provide fallback to new tab.
- **Save Flow**: After editing, user confirms final asset to sync metadata (design URL, preview image, brand tags) into `campaign_assets`.
- **Error Messaging**: Friendly copy for expired tokens (“Reconnect Canva”), quota exceeded, API errors. Offer manual download instructions as fallback.

---

## 6. Plan Enforcement

| Plan | Access | Notes |
| --- | --- | --- |
| Free | View-only previews, “Upgrade to edit in Canva” CTA | Still track clicks for conversion metrics |
| Pro | Full integration, 200 automated asset tasks/month (soft) | Warn at 80% usage |
| Agency | Full integration + brand template library + custom template upload | Support per-client templates |

Usage logged via feature keys:
- `integration_connect` when OAuth succeeds.
- `asset_generate` when automation pipeline creates design.
- `asset_finalize` (optional) when user saves final asset.

---

## 7. Automation (n8n)

`asset-production` workflow uses Canva node or HTTP call:
1. Fetch template ID + brand settings.
2. Replace text/colour placeholders with Gemini output.
3. Create design, store returned link and thumbnails.
4. Optionally send Slack notification for approval.

Ensure workflow uses workspace-scoped credentials; never reuse tokens between workspaces.

---

## 8. Fallback Strategy

If Canva API unavailable:
- Provide static template downloads hosted in Supabase Storage.
- Allow manual upload of assets to continue campaign progress.
- Record incident in changelog; notify users via in-app banner.

---

## 9. Testing & QA

- Use Canva sandbox account for staging; avoid hitting production templates.
- Automated tests mock Canva responses (fixtures under `tests/fixtures/canva`).
- Manual QA:
  1. Connect Canva (fresh token).
  2. Generate design via Launchpad.
  3. Edit design and confirm metadata saved.
  4. Disconnect and reconnect flow.
  5. Ensure Free plan sees upsell gating.

Keep this guide updated with API changes, scope requests, and template best practices.*** End Patch

