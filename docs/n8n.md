# n8n Workflow Guide · Studio 24

This guide documents how Studio 24 uses n8n for automation. It covers environment setup, workflow standards, version control, deployment, and QA.

---

## 1. Instance Setup

- **Hosting**: Fly.io or Railway container with persistent volume (`/home/node/.n8n`).
- **Authentication**:
  - `N8N_ENCRYPTION_KEY` set once and stored securely.
  - Basic auth for editor UI (`N8N_BASIC_AUTH_ACTIVE=true`).
  - Disable telemetry (`N8N_DIAGNOSTICS_ENABLED=false`).
- **Environments**: Separate instances for staging and production. Never edit workflows directly in production—promote via exports.
- **Backups**: Enable daily volume snapshots; commit workflow JSON to Git for additional safety.

---

## 2. Workflow Catalogue

| Key | File | Purpose |
| --- | --- | --- |
| `campaign-launch` | `workflows/n8n/campaign-launch.json` | Ideation: Gemini copy generation for briefs |
| `asset-production` | `workflows/n8n/asset-production.json` | Canva/Remotion automation for visuals & clips |
| `scheduler` | `workflows/n8n/scheduler.json` | Multi-platform scheduling and posting |
| `analytics-sync` | `workflows/n8n/analytics-sync.json` | Fetch metrics & generate insights |
| `notifications` | `workflows/n8n/notifications.json` | Slack/email/in-app alerts |

Each workflow must include metadata node describing version, author, and changelog snippet.

---

## 3. Development Workflow

1. **Design**  
   - Draft workflow in local or staging instance using mock credentials.  
   - Document input/output schema (JSON examples) in this file.

2. **Export**  
   - Export as JSON (`Settings → Download`).  
   - Place in `workflows/n8n/<workflow>.json`.  
   - Add entry to `workflows/README.md` describing change.

3. **Review**  
   - Include diff in PR.  
   - Reviewers check for secrets, retry logic, error branches, and alignment with docs.

4. **Deploy**  
   - Merge PR → GitHub Action `deploy-workflows.yml` uploads JSON to staging n8n via REST API.  
   - After validation, manually promote to production using same action with `environment=production`.

---

## 4. Coding Standards

- **Inputs**: Accept minimal payload (IDs, context). Fetch additional data inside workflow to avoid large HTTP payloads.
- **Credentials**: Use n8n credentials for third-party services. When necessary, call Next.js proxy endpoints to retrieve short-lived tokens.
- **Error Handling**: Wrap HTTP nodes with IF branches to capture non-2xx responses. Use `Execute Workflow` node for retries if logic complex.
- **Idempotency**: Include unique run IDs to prevent duplicate postings if webhook replays occur.
- **Logging**: POST to `/api/workflows/log` (or direct Supabase insert) for major steps. Always log success and failure.
- **Timeouts**: Keep nodes performant (<60s). For long tasks, offload to service (e.g., Remotion render) and poll status.

---

## 5. Integration Notes

- **Supabase**: Use REST or Supabase node with service-role key. Limit `SELECT` to required columns; never expose service key in workflow export (store as credential).
- **Gemini**: Prefer calling Next.js endpoint to reuse prompt/parsers unless workflow-specific logic required.
- **Canva**: Use HTTP node with OAuth credential referencing workspace tokens; handle 401 by triggering token refresh via API.
- **Remotion**: Use Next.js proxy endpoint to maintain consistent quota checks and to refresh render status.
- **Social APIs**: Use per-platform credentials stored in n8n; tokens retrieved via Next.js refresh endpoint before publishing.

---

## 6. Testing & QA

- Maintain mock payloads in `workflows/tests/*.json`.
- Manual QA for each workflow:
  1. Execute with staging workspace + mock data.
  2. Confirm Supabase records updated.
  3. Inspect run for errors/warnings.
  4. Validate webhooks update Automation Cockpit.
- Write integration tests (Next.js) that trigger workflows and assert expected DB side effects using the staging n8n instance.

---

## 7. Monitoring & Alerts

- Enable n8n Webhook to Next.js (`/api/webhooks/n8n`) for every run update.
- Failed runs trigger notifications workflow (Slack/email).
- Use n8n’s execution list + external logging (Logflare/Sentry) to monitor error trends.
- Set up heartbeat check to ensure n8n instance healthy (e.g., Pingdom).

---

## 8. Security

- Encrypt credentials with `N8N_ENCRYPTION_KEY` and restrict editor access to trusted accounts.
- Audit workflow JSON before merge—no secrets or personally identifiable data.
- Keep track of tokens in Supabase; rotate credentials quarterly or when vendors require.

---

Keep this guide updated with new workflows, credentials, or deployment processes. If the automation footprint grows, consider adding workflow diagrams or runbooks per integration.***

