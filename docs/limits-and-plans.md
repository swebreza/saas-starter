# Studio 24 · Plans & Usage Limits

Plan logic underpins pricing, gating, and automation cost control. This document defines plan entitlements, feature keys, quotas, and enforcement rules used by `lib/limits.ts`, UI messaging, and n8n workflows.

---

## 1. Plan Overview (Launch Configuration)

| Plan | Price (USD/mo) | Ideal Customer | Highlights |
| --- | --- | --- | --- |
| **Free** | $0 | New creators validating workflow | 1 workspace, 1 seat, 3 campaign runs/week, manual publishing, 7-day analytics history, limited automation previews |
| **Pro** | $59 | Growing creator or small team | 1 workspace, 2 seats, unlimited AI ideation, 50 scheduled posts/month, Canva + Remotion automation, 90-day analytics history, client-ready reports |
| **Agency** | $149 | Agencies managing multiple brands | Unlimited workspaces, 5 seats (scalable), 200 scheduled posts/month, advanced analytics, white-label reporting, priority support |

### Add-ons
- **Extra seats**: $15/seat/month (Pro only), $20/seat/month (Agency beyond included 5).
- **Scheduled post credits**: $25 per additional 100 posts/month.
- **Premium support SLA**: $29/month (Agency only) – escalated response channel.

---

## 2. Feature Keys

Use these keys when logging usage, enforcing quotas, or toggling features:

| Key | Description | Notes |
| --- | --- | --- |
| `campaign_run` | Launchpad/n8n campaign workflows triggered | Counts Free weekly allotment |
| `copy_generate` | Gemini copy generation (hooks, scripts, captions) | Includes Text Studio |
| `asset_generate` | Canva/Remotion automation calls | Includes video & image production |
| `scheduler_post` | Scheduled/published post via n8n | Consumes post credits |
| `analytics_sync` | Analytics fetch runs | Track cost-heavy syncs |
| `report_export` | Generated client report (PDF/HTML) | Premium feature |
| `integration_connect` | Successful OAuth connection (Canva, social, Slack, etc.) | For telemetry only |
| `automation_retry` | Manual retry of failed workflows | Monitor churn risk / quality |

Add new keys here and in `lib/limits.ts` when introducing additional capabilities.

---

## 3. Quotas & Gating Rules

| Feature | Free | Pro | Agency |
| --- | --- | --- | --- |
| Campaign runs (`campaign_run`) | 3 per rolling 7 days | Unlimited (soft monitor @ 60/week) | Unlimited |
| Copy generation (`copy_generate`) | 30 responses/week | Unlimited | Unlimited |
| Asset automation (`asset_generate`) | Preview only (watermarked thumbnails) | 200 tasks/month (soft cap) | 750 tasks/month (soft cap) |
| Scheduled posts (`scheduler_post`) | Manual export only | 50 posts/month (metered) | 200 posts/month (metered) |
| Analytics sync (`analytics_sync`) | 1 platform, 7-day history | 3 platforms, 90-day history | Unlimited platforms, 365-day history |
| Workspaces | 1 | 1 | Unlimited |
| Seats | 1 | 2 (add-on available) | 5 (add-on available) |
| Saved campaigns/assets | Last 3 campaigns retained | Unlimited | Unlimited + client folders |
| Canva integration | View-only templates | Full OAuth handoff | Full + template library management |
| Remotion automation | Not available | Standard templates | Advanced presets + custom branding |
| n8n workflow customization | Not available | Use prebuilt workflows | Allow custom workflow overrides |
| Support SLA | Community | Next-business-day | Priority (upgrade available) |

Soft caps trigger warnings but not hard blocks; they exist to monitor cost outliers. Hard limits (Free quotas and post credits) enforce `LIMIT_REACHED`.

---

## 4. Enforcement Flow

1. API route resolves request context (workspace, user, plan) using Supabase session.
2. `assertWithinPlan(workspaceId, featureKey, { count?, metadata? })` checks quotas and returns:
   - `ok` (proceed)
   - `LIMIT_REACHED` (quota exceeded)
   - `BILLING_REQUIRED` (feature not included on current plan)
3. On success, handler records usage via `recordUsage(workspaceId, featureKey, metadata)` or increments metered counters.
4. On failure, return `{ success: false, error: { code, message, upgradeHint } }`. UI must provide upgrade/paywall messaging.
5. n8n workflows call `/api/workflows/usage` to ensure quotas before execution (prevent runaway automation).

Usage data stored in `usage_counters` (aggregated) and `usage_logs` (event-level) with metadata (e.g., `{ platform: 'instagram', tokens: 845 }`).

---

## 5. Stripe & Metered Billing

- Post credits beyond plan limits emit `scheduler_post` usage events flagged `billable: true`.
- Add-ons purchased raise monthly quota for the billing period. Update `plan_features` and `subscriptions` accordingly.
- When credits exhausted, UI prompts upgrade or add-on purchase before allowing new scheduled posts.
- Webhook handler reconciles subscription status, seat limits, and overage charges; `lib/limits.ts` reads canonical values from DB.

---

## 6. UI & Messaging Guidelines

- Always show remaining quota near CTA buttons (e.g., “2 of 3 campaign runs left this week”).
- Warn users when soft cap consumption >80% (“You’ve used 160/200 automation tasks – consider upgrading”).
- Free plan surfaces sample outputs (blurred/watermarked) with clear benefit statements for upgrading.
- Agency dashboards surface SLA status and support contact details.

---

## 7. Extending Plans

1. Update this document with new quota/feature definition.
2. Adjust `plan_features` seed data and Supabase tables.
3. Modify `lib/limits.ts` config map and add tests.
4. Ensure UI copy, pricing page, and billing flows match new entitlements.
5. Communicate changes via changelog / release notes.

Maintaining a tight coupling between documentation, enforcement logic, and pricing surfaces keeps Studio 24 trustworthy and monetizable.*** End Patch***

