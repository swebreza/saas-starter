# Studio 24 · Implementation Roadmap
<!-- markdownlint-disable MD024 -->

This roadmap sequences the rebuild of Studio 24 into a sellable social automation platform. Complete each phase in order and update this document whenever scope or sequencing changes. Every phase references the core docs (`overview.md`, `architecture-summary.md`, `detailed-architecture.md`, `development-playbook.md`, `environment.md`)—review them before starting new work.

---

## Phase 0 · Context Reset & Research
**Objective:** Align strategy, market positioning, and integration landscape before touching code.

**Deliverables**
- Competitive analysis (Buffer, Later, Metricool) summarising onboarding, pricing, automation, differentiators.
- Persona + JTBD briefs for creators, agencies, SMEs (added to `overview.md`).
- Remotion Worker capability audit documented in `docs/remotion.md`.
- Updated `.env.example` and secrets inventory reflecting new stack.

**Acceptance Criteria**
- Research findings captured in docs; assumptions logged.
- Decision on Remotion Worker vs fallback recorded with integration contract.
- Contributors can articulate product mission, target personas, and success metrics verbatim.

---

## Phase 1 · Documentation Foundation (Single Source of Truth)
**Objective:** Replace legacy docs with the new canonical documentation suite.

**Deliverables**
- Rewrite of required docs: `overview.md`, `architecture-summary.md`, `detailed-architecture.md`, `environment.md`, `development-playbook.md`, `implementation-roadmap.md`, `limits-and-plans.md`, `canva.md`, `gemini.md`.
- New docs as needed: `docs/n8n.md`, `docs/remotion.md`, `docs/social-platforms.md`.
- README refresh linking to updated docs and summarising product direction.

**Acceptance Criteria**
- All docs reference the new automation-first architecture and monetization plan.
- No stale references to legacy features; optional docs removed unless justified.
- Cursor can reason purely from documentation without ambiguity.

---

## Phase 2 · Platform Architecture & Tooling
**Objective:** Lay technical foundations—auth, database schema, environment automation.

**Deliverables**
- Supabase schema migrations implementing tables from `detailed-architecture.md` (users, workspaces, integrations, campaigns, automation, analytics, billing).
- Auth stack decision (Auth.js + Supabase adapter) implemented with onboarding flow.
- Plan enforcement helper (`lib/limits.ts`) with quota scaffolding.
- CI/CD pipeline updates (lint, test, database migration hook).
- Initial integration stubs (Gemini, Canva, Remotion Worker, n8n, Stripe) with typed clients and mocked responses.

**Acceptance Criteria**
- Local/staging environments provisioned via documented commands.
- Tests run in CI; migrations apply cleanly.
- Authenticated user can create workspace, view dashboard shell, and see plan status (no automation yet).
- All secrets configured per `environment.md`.

---

## Phase 3 · Automation Backbone (n8n Workflows)
**Objective:** Build the automation layer before UI polish.

**Deliverables**
- n8n instance (staging) deployed and secured.
- Workflows authored and versioned: `campaign-launch`, `asset-production`, `scheduler`, `analytics-sync`, `notifications`.
- Next.js API endpoints to trigger/poll/cancel workflows, verify webhooks, record automation runs.
- Workflow promotion pipeline (`deploy-workflows.yml`).
- Logging + monitoring for workflow executions.

**Acceptance Criteria**
- Triggering `/api/content/campaign` in staging kicks off n8n run and stores output in Supabase.
- Scheduler workflow can publish to at least one sandbox social API account.
- Failures recorded in `automation_runs` with retry path available via API.
- Workflow exports stored in Git; team can roll back or promote versions easily.

---

## Phase 4 · Product Experience (UI, Content Engine, Analytics)
**Objective:** Deliver the customer-facing surfaces powered by the automation backbone.

**Deliverables**
- Campaign Launchpad, Calendar, Automation Cockpit, Analytics Hub pages.
- Gemini-powered copy generation integrated with UI (prompt builders, structured outputs).
- Canva + Remotion Worker integrations wired through UI (connection flow, asset previews, links).
- Brand library management (voice, templates, assets).
- Analytics dashboards driven by `analytics_metrics` + `analytics_insights`.
- Feature gating and upsell experiences (Free vs Pro vs Agency).

**Acceptance Criteria**
- End-to-end campaign flow in staging: brief → AI concepts → asset generation → scheduling → analytics.
- Usage quotas enforced with clear messaging and upgrade paths.
- UI meets accessibility baseline (WCAG AA checklist).
- Observability dashboards (Sentry/logs) show real-time automation and API status.

---

## Phase 5 · Monetization, QA & Launch
**Objective:** Finalise billing, polish, and go-to-market readiness.

**Deliverables**
- Stripe billing (checkout, portal, webhooks, metered usage) fully enabled.
- Marketing site refresh reflecting final pricing and feature tiers.
- QA plan execution (unit/integration/e2e tests, workflow rehearsals, load tests).
- Compliance package (privacy policy, terms, data retention, platform policy acknowledgements).
- Launch checklist: monitoring alerts, incident playbook, support tooling, onboarding drip emails.

**Acceptance Criteria**
- Paid plans charge correctly; downgrades/cancellations handled gracefully.
- All critical workflows pass automated test suite and manual QA sign-off.
- Playbooks for incident response and customer support documented.
- Beta customers complete success criteria (time-to-first-campaign < 24h, retention signals) prior to GA.

---

## Ongoing Activities
- **Post-launch iteration:** Marketplace integrations, AI personalization, agency collaboration features.
- **Analytics & Insight:** Monitor activation, conversion, retention, automation utilisation; feed into experimentation backlog.
- **Doc Maintenance:** Update docs whenever features or architecture evolve; run quarterly doc review.

---

## Governance
- Weekly roadmap review: update status per phase, log blockers, adjust sequencing if required.
- Major deviations require doc updates before implementation.
- Keep changelog entries (optional `changelog.md`) for external communication.

This roadmap provides the execution compass—use it to keep the rebuild disciplined and aligned with Studio 24’s automation-first strategy.

