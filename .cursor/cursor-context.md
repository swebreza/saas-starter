# ✅ Cursor Bootstrap Context
**Filename**: `cursor-context.md`  
*(This file is meant to fully instruct Cursor on how to behave, reason, and operate across your project. No other outside instruction should be needed.)*

---

## 🧠 Project Overview

We are building a **custom SaaS product** based on the official [`nextjs/saas-starter`](https://github.com/vercel/nextjs-saas-starter) template. However, the base template has been **heavily modified** to fit a new product direction, with specific features, API integrations, and workflows. We're **resetting all documentation**, and this project should now be treated as a **from-scratch SaaS implementation**, using only the structure defined in this context.

## 💡 Primary Goals

- Build a modular, scalable SaaS product based on Next.js
- Integrate AI and media generation (via Gemini & Canva APIs)
- Ensure all core logic is traceable, documented, and reasoned by `.cursor`
- Keep developer workflows clean, minimal, and reproducible
- Let Cursor **reason independently** from this file and the referenced docs

---

## 🛠 Tech Stack Summary

- **Frontend**: Next.js (app dir), TailwindCSS, ShadCN
- **Backend**: Next.js API routes + Prisma
- **Auth**: NextAuth.js or custom JWT (TBD)
- **Database**: PostgreSQL
- **AI Integration**: Google Gemini API
- **Media Integration**: Canva API (simple version)
- **CI/CD**: Vercel
- **Dev Automation**: Cursor + .cursor config
- **Workflow Logic**: Make.com or n8n (future)

---

## 🧩 .cursor Behavior & Context Rules

This project depends heavily on **`.cursor` automation**. It is configured to always refer to these exact documentation files:

| File Name                   | Purpose                                            |
|----------------------------|----------------------------------------------------|
| `overview.md`              | What the product is, what it does, and why        |
| `architecture-summary.md`  | Simple high-level view of the tech stack & flows  |
| `detailed-architecture.md` | Full system design, file structure, and data flow |
| `environment.md`           | Local setup, `.env` keys, and API configurations  |
| `implementation-roadmap.md`| Timeline, status of work, and what's next         |
| `development-playbook.md`  | Coding standards, branching, testing rules        |
| `limits-and-plans.md`      | Feature limits per plan (free/paid/etc.)          |
| `canva.md`                 | Canva API usage: integration, endpoints, errors   |
| `gemini.md`                | Gemini API logic: prompts, patterns, responses    |

Cursor must **always reason using these files**. If information is not found, it should not hallucinate — instead, it should suggest updating the relevant file.

---

## 📂 File Convention Reset

We have **deleted all previous `.md` files**. The project starts clean. Only the above-mentioned documentation files should exist. All other project-wide reasoning, prompts, tasks, or generation instructions should defer to these files.

This ensures:

- `.cursor` never looks at stale or unapproved docs
- Every context-aware generation is consistent
- Team members and AI share the same ground truth

---

## 🧠 How Cursor Should Think

> “I am working on a SaaS product built from the nextjs/saas-starter base, but customized. I am allowed to make architectural decisions, suggest components, or modify structure, as long as I align with the context files. If something feels underspecified, I must suggest which file to update or what is missing. My default job is to reason clearly, automate wherever possible, and keep all work aligned with the minimal but complete documentation set.”

---

## ✅ Cursor Expectations Checklist

**Cursor must:**

- Read and reason from only the allowed `.md` files
- Automatically apply reasoning to code generation, testing, or cleanup
- Align tasks to `implementation-roadmap.md` before starting
- Use environment details from `environment.md` when deploying or simulating
- Apply file structure from `detailed-architecture.md` when scaffolding
- Default to “minimal, efficient, working” code style
- Never require human input if information exists in the context

If a file is missing info, Cursor should:

> “Pause execution, suggest what needs to be added or clarified in the source documentation, and once updated, continue automatically.”

---

## 🔌 API Integration Notes

### Gemini (gemini.md)
- Used for: AI-generated text, insights, and content assist
- Handles prompt generation, streaming responses
- Provides recommendations for post performance

### Canva (canva.md)
- Used for: Media generation, editing templates
- Limited to simple API interactions (no full editor)
- Used to auto-generate post thumbnails, banners, etc.

---

## 📊 Feature Scope

Initial features required (Cursor should assume these are core to the app):

- Social media scheduler
- Post analytics
- AI-assisted content generation
- Image/banner generation via Canva
- Team collaboration
- Simple pricing tier enforcement (Free vs Premium)

Each of these is to be supported by documented logic across the .md files.

---

## 📁 Optional Files (Create only if needed)

- `hackathon.md` — If submitting to a hackathon
- `investor-pitch.md` — If presenting to VCs
- `changelog.md` — If tracking version history

These are not referenced by `.cursor` unless explicitly required.

---

## 🧼 General Philosophy

- Default to simple, automated solutions
- Avoid unnecessary abstraction
- Prefer working prototypes over perfect scaffolds
- Maintain alignment with doc files — these are the single source of truth

---

## 🔚 End of Context