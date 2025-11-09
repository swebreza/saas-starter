# Remotion Worker Integration Guide · Studio 24

Remotion Worker (a.k.a. Remotion Lambda) is the video automation service we use to render short-form assets programmatically. This guide documents prerequisites, API usage, workflow integration, and testing for the Remotion setup.

---

## 1. Capabilities & Assumptions

- Render MP4 videos (vertical, square, widescreen) from React-based Remotion compositions.
- Apply brand overlays, captions, lower-thirds, and motion graphics supplied as props.
- Generate captions/SRT when provided as composition props.
- Host rendered media in S3/CloudFront and return a signed download URL.
- Scale via AWS Lambda; costs depend on render duration and concurrency.

---

## 2. Prerequisites

1. **Remotion Project**: Located under `apps/remotion/` (or similar) with compositions for each video template (reel, teaser, carousel video).
2. **Deploy to Lambda**:
   - Install Remotion CLI (`npm install -g remotion`).
   - Configure AWS credentials (`REMOTION_AWS_ACCESS_KEY_ID`, `REMOTION_AWS_SECRET_ACCESS_KEY`, `REMOTION_AWS_REGION`).
   - Run `npx remotion lambda sites create` to upload the bundle.
   - Note the `siteId` (used when triggering renders).
3. **Environment**: Provide serve URL or site ID plus AWS credentials for render functions (see Environment Variables).

---

## 3. Environment Variables

| Variable | Scope | Description |
| --- | --- | --- |
| `REMOTION_SITE_ID` | server | ID returned by `remotion lambda sites create` |
| `REMOTION_SERVE_URL` | server | Alternate to site ID if using static hosting for bundle |
| `REMOTION_AWS_REGION` | server | AWS region where Lambda renders (e.g., `us-east-1`) |
| `REMOTION_AWS_ACCESS_KEY_ID` | server | Programmatic AWS access key for Remotion Lambda |
| `REMOTION_AWS_SECRET_ACCESS_KEY` | server | Programmatic AWS secret key |
| `REMOTION_MAX_CONCURRENCY` | server | Optional; cap concurrent renders to control cost |
| `REMOTION_OUTPUT_BUCKET` | server | S3 bucket storing rendered media (if custom) |

Store these secrets in Vercel + Supabase configuration; never expose them to the client.

---

## 4. Integration Flow

1. **Job Request**: n8n `asset-production` workflow calls `/api/media/remotion/render` with payload:
   ```json
   {
     "compositionId": "reel-vertical",
     "props": {
       "audioUrl": "...",
       "captions": [...],
       "brandColors": ["#5B21B6", "#F97316"],
       "overlayText": [...]
     },
     "codec": "h264",
     "fps": 30,
     "durationInFrames": 900,
     "outputFormat": "mp4"
   }
   ```
2. **Validation**: API enforces plan quotas (`asset_generate`), verifies inputs, and enriches props (brand guidelines, CTA overlays).
3. **Render Invocation**: Server uses Remotion `renderMediaOnLambda` or REST API wrapper to start render. Response includes `renderId`.
4. **Tracking**: Store `renderId` and parameters in `automation_runs` (`metadata.remotionRenderId`).
5. **Polling**: n8n polls `/api/media/remotion/status?renderId=...` which calls `getRenderProgress` until `completed`.
6. **Completion**:
   - Download production URL (signed S3 link) and move asset into Supabase storage (or keep S3 if accessible).
   - Persist metadata in `campaign_assets` (duration, aspect ratio, caption track, etc.).
   - Update usage counters and trigger notification workflow.

---

## 5. Error Handling & Retries

- **Common errors**:
  - `RenderDeletedError`: render purged; restart job.
  - `TimeoutError`: composition exceeded Lambda limits; split render or reduce duration.
  - `BucketNotFound`: ensure `REMOTION_OUTPUT_BUCKET` exists.
- Retries: automatic (n8n) for transient failures; manual retry available in Automation Cockpit.
- Log all failures with payload snapshot (minus secrets) for debugging.

---

## 6. Cost Monitoring

- Capture `estimatedPrice` returned by Remotion API (seconds * memory). Store in `automation_runs.cost_estimate`.
- Warn when monthly rendering cost approaches budget; expose metrics in analytics dashboard.
- Use `REMOTION_MAX_CONCURRENCY` to avoid unexpected spikes.

---

## 7. Testing & QA

- **Unit tests**: mock Remotion client functions (`renderMediaOnLambda`, `getRenderProgress`).
- **Integration tests**: run against staging Lambda with small (5s) composition.
- **Manual QA steps**:
  1. Trigger render from staging workspace via Automation Cockpit.
  2. Monitor status endpoint until complete.
  3. Verify asset saved in storage and accessible via UI.
  4. Confirm captions/overlays align with props.
  5. Retry and cancellation flows behave as expected.

For local development without AWS costs, use Remotion’s `renderMedia()` locally or keep `REMOTION_MOCK=true` to short-circuit renders.

---

## 8. Security & Compliance

- Restrict AWS credentials to least privilege (Lambda invoke, S3 read/write for output bucket, CloudWatch logs).
- Do not log raw AWS credentials or user media URLs.
- Provide disclosures if AI-generated media requires labeling on target platforms.

---

## 9. Fallbacks

If Remotion becomes unavailable or cost-prohibitive, fall back to:

| Alternative | Pros | Cons |
| --- | --- | --- |
| Shotstack | Managed rendering, HTTP API | Paid usage, watermark on free tier |
| Custom FFmpeg Worker | Full control, no vendor lock | Increased maintenance + infra burden |

Document fallback decision in this file if we switch providers.

Keep this guide updated with deployment changes, new compositions, or cost adjustments.***

