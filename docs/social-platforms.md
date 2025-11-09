# Social Platform Integrations · Studio 24

Studio 24 integrates with multiple social platforms for scheduling and analytics. This guide outlines required scopes, API endpoints, rate limits, and testing procedures for each platform.

---

## 1. Common Patterns

- **OAuth Redirect**: `/api/integrations/<platform>/callback`
- **Token Storage**: Supabase `credentials` table (encrypted) linked to `workspace_integrations`
- **Refresh Flow**: Next.js endpoint `/api/social/<platform>/refresh` provides short-lived access tokens to n8n workflows
- **Publishing**: n8n `scheduler` workflow uses tokens and platform-specific nodes/helper functions under `lib/social/*`
- **Analytics**: n8n `analytics-sync` workflow fetches metrics nightly and stores results in `analytics_metrics`
- **Error Handling**: Standard error shape `{ code, message, action }` surfaced in Automation Cockpit

---

## 2. Platform Matrix

| Platform | OAuth Scopes | Posting Endpoint | Analytics Endpoint | Rate Limit Considerations |
| --- | --- | --- | --- | --- |
| **Instagram (via Facebook Graph)** | `instagram_content_publish`, `pages_manage_posts`, `pages_show_list`, `business_management` | `POST https://graph.facebook.com/{igUserId}/media` + `publish` | `GET https://graph.facebook.com/{igUserId}/insights` | Respect upload-size limits; video requires creation + publishing steps |
| **Facebook Pages** | `pages_manage_posts`, `pages_read_engagement` | `POST https://graph.facebook.com/{pageId}/feed` | `GET https://graph.facebook.com/{pageId}/insights` | Avoid duplicate posts; Graph API enforces per-page quotas |
| **YouTube** | `https://www.googleapis.com/auth/youtube.upload`, `...readonly` | `POST https://www.googleapis.com/upload/youtube/v3/videos` | `GET https://www.googleapis.com/youtube/v3/videos` + `reports` | Uploads require resumable sessions; transcode delay before publish |
| **TikTok** | `video.upload`, `video.publish`, `user.info.basic`, `video.list` | `POST https://open-api.tiktok.com/share/video/upload` + `publish` | `GET https://open-api.tiktok.com/share/video/list` | Expiring tokens; refresh before each publish; video size/time limits apply |
| **LinkedIn** | `w_member_social`, `r_member_social`, `rw_organization_admin` (for pages) | `POST https://api.linkedin.com/v2/ugcPosts` | `GET https://api.linkedin.com/v2/organizationalEntityShareStatistics` | Requires compliance text for sponsored posts; API quota per organization |
| **X (Twitter)** | OAuth 2.0 `tweet.read tweet.write users.read offline.access` | `POST https://api.twitter.com/2/tweets` | `GET https://api.twitter.com/2/tweets/{id}/engagement` | Elevated access required for scheduling/analytics |

Add/remove platforms as roadmap evolves; update table accordingly.

---

## 3. Scheduling Workflow Requirements

1. Validate workspace plan allows scheduling.
2. Retrieve and refresh tokens via Next.js proxy before n8n posts.
3. Format content per platform (character limits, hashtags, mentions, aspect ratio).
4. Handle media uploads (multi-step for video). Store remote IDs in `scheduled_posts.platform_post_id`.
5. Mark status `scheduled` (if API supports scheduling) or `posted`.
6. On failure, update `scheduled_posts` with `error_message` and trigger notification workflow.

---

## 4. Analytics Sync Requirements

- Schedule nightly run per workspace timezone.
- Fetch post-level metrics (views, likes, comments, shares, CTR) and channel-level metrics (followers, watch time).
- Normalize metrics to canonical keys in `analytics_metrics`.
- Derive insights in `analytics_insights` (e.g., best performing platform, posting time).
- Respect API pagination and rate limits; store continuation tokens if needed.

---

## 5. Testing & Sandbox Accounts

- Maintain sandbox/test accounts for each platform:
  - Instagram/Facebook: Meta test business assets.
  - YouTube: Brand test channel.
  - TikTok: Sandbox app (if available) or manual staging account.
  - LinkedIn: Demo company page.
  - X (Twitter): Developer test account.
- Automated tests mock API responses; do not hit real APIs during unit/integration tests.
- Manual QA checklist per release:
  1. Connect account.
  2. Schedule post for 5 minutes out (staging).
  3. Validate publish confirmation.
  4. Confirm analytics logged next day.
  5. Disconnect and ensure tokens removed.

---

## 6. Compliance Notes

- Follow each platform’s branding and disclosure guidelines (AI-generated content may require labeling).
- Handle user-generated content rights per platform policy.
- Provide opt-out and manual override for scheduling if user tokens expire.

Keep this file updated when scopes change, endpoints upgrade, or new platforms are added.***

