# Gemini Integration Guide · Studio 24

This document describes how Studio 24 uses Google Gemini for copy generation, ideation, and summarisation. It defines prompt templates, client behaviour, cost controls, and error handling.

---

## 1. Goals

- Generate on-brand copy (hooks, scripts, captions, outlines) for multi-platform campaigns.
- Summarise analytics data into actionable insights.
- Support highlight extraction for repurposed video/audio content.
- Maintain predictable performance and cost per run.

---

## 2. API Usage

- **Model**: `gemini-2.5-flash` (primary). Evaluate `gemini-2.0-pro` for longer-form tasks post-launch.
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/<MODEL>:generateContent`.
- **Auth**: API key (`GEMINI_API_KEY`) loaded from server environment only. Never expose to client.
- **Transport**: `fetch` from Next.js server routes with timeout (10s default). Retries (2 attempts) for `429/500` errors.
- **Response handling**: Expect JSON output via `responseMimeType: "application/json"`; validate with Zod before use.

Module structure:
- `lib/gemini/prompts.ts` – template literals with interpolated variables.
- `lib/gemini/client.ts` – request builder, retry logic, error mapping.
- `lib/gemini/parsers.ts` – Zod schemas for each response contract.

---

## 3. Prompt Templates

### 3.1 Campaign Ideation
- **Input**: brand voice, audience, offer, platforms, CTA preferences.
- **Output**: 3–5 campaign concepts with hook, angle, recommended asset type.
- **Notes**: Request JSON array; include token counts in metadata.

### 3.2 Copy Generation (Hooks, Scripts, Captions)
- Multi-platform prompts with fields for tone, platform norms, call to action.
- Example schema:
```json
{
  "variants": [
    {
      "platform": "tiktok",
      "hook": "string",
      "script": "string",
      "cta": "string",
      "length_seconds": 45
    }
  ]
}
```

### 3.3 Analytics Insights
- Summarise metrics with context (“top performing post”, “declining channel”).
- Prompt includes data table (top N metrics). Response returns bullet list of insights + recommendations.

### 3.4 Highlight Extraction
- Provide transcript chunk + context.
- Output includes start/end timestamps, hook text, overlay text suggestions.

All prompt templates must be versioned and referenced in docs when updated.

---

## 4. Cost Management

- Track `tokens_in`, `tokens_out`, `cost_estimate` per request (store in `automation_runs.cost_estimate`).
- Free plan: throttle to 30 copy generations/week.
- For long transcripts, chunk input and combine results to stay within token limits.
- Use caching for repeated analytics prompts (memoise by metric hash).
- Provide `MOCK_GEMINI=true` mode returning deterministic fixtures for local development.

---

## 5. Error Handling

- Standard error shape: `{ code: 'GEMINI_ERROR', message, details }`.
- Map HTTP statuses:
  - `400`: validation fail → prompt bug (log & alert)
  - `401/403`: key issue → disable feature, alert team
  - `429`: rate limit → exponential backoff, surface “busy” message
  - `500+`: retry twice, then friendly fallback copy
- Log prompt + metadata (without PII) for debugging.
- Record failures in `automation_events` (`event_type = 'gemini_error'`).

---

## 6. Testing & QA

- Unit tests: parse functions ensure schema adherence.
- Integration tests: mock fetch with fixtures; assert usage logging.
- Manual QA checklist:
  1. Run campaign ideation with Free and Pro plan.
  2. Validate highlight extraction on 10-minute transcript.
  3. Force API key failure to ensure user-facing error message.
  4. Confirm `MOCK_GEMINI` bypass works.

---

## 7. Future Work

- Explore streaming responses for longer scripts.
- Investigate multimodal models for direct image generation (optional).
- Implement personalized fine-tuning via user-provided exemplars (Phase 7+).

Keep this guide updated with prompt revisions, cost changes, and new capabilities.*** End Patch

