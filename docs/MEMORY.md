# Project Memory & Decisions Ledger
## Project: Civic-Sense

**Purpose:** Running context and architectural memory for engineers and AI pair-programmers picking this repository up across sessions.

---

## 🎯 Project Identity & Core Thesis

- **Product Name:** Civic-Sense
- **Core Value Proposition:** AI-assisted civic complaint router that automates triage (zero human delay) and establishes radical transparency via a public, tamper-proof SLA accountability dashboard.
- **Differentiator:** Replaces the civic complaint "black hole" with fixed SLA deadlines and live public breach tracking that departments cannot alter.

---

## 📚 Documentation Index & Reading Order

1. [`PRD.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/PRD.md) — Product requirements, personas, user flows, and success metrics.
2. [`ARCHITECTURE.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/ARCHITECTURE.md) — System design, data flow diagrams, ER schemas, and state machine.
3. [`RULES.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/RULES.md) — Engineering guardrails and non-negotiables.
4. [`DESIGN.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/DESIGN.md) — Visual design tokens, typography, component specs, and UX wireframes.
5. [`TASKS.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/TASKS.md) — Build checklist and execution roadmap (13 phases).
6. [`MEMORY.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/MEMORY.md) — This ledger of decisions and current status.

---

## 🧠 Key Decisions Made So Far (and Why)

| Decision | Reasoning |
|---|---|
| **Next.js 14+ (App Router) & TypeScript** | Single full-stack framework with typed server route handlers and fast client rendering; eliminates separate backend repository. |
| **PostgreSQL on Neon** | Real relational DB with proper concurrency and ACID guarantees; serverless Postgres on free tier with zero server maintenance. |
| **Prisma ORM** | Type-safe database queries, declarative schema migrations, and transactional integrity for status audit trails. |
| **Google OAuth via Auth.js (NextAuth v5)** | Zero password storage liability or credential leaks; authenticates identity reliably while server-side callbacks enforce roles. |
| **Admin-Assigned Roles (Identity $\neq$ Role)** | Google OAuth proves identity, not role. Users default to `CITIZEN`; `DEPARTMENT_STAFF` and `ADMIN` must be assigned by an admin via protected API. |
| **Google Gemini Vision API (`@google/generative-ai`)** | Real multimodal AI image classification with isolated contract (`{ category, severity, confidence, needsHumanReview }`) and heuristic fallback. |
| **Vercel Blob Storage** | Serverless Next.js functions have no persistent local disk; uploads are stored directly in cloud blob storage. |
| **Pure CSS Modules & USWDS Design Tokens** | Scoped component styling, municipal authority aesthetic (`--ink`, `--paper`, `--amber`, `--brick`, `--forest`), zero third-party UI framework bloat. |
| **Vercel Hosting Target** | Native deployment platform optimized for Next.js 14 App Router and serverless edge functions. |
| **Strict Forward-Only State Machine** | `SUBMITTED` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` guarantees immutable audit logs in `StatusHistory`. |
| **Zero-Login Public Dashboard** | Public accountability requires open access for citizens and journalists without barrier to entry. |
| *[Old Stack] Single Node/Express web app* | *Superseded by Next.js App Router.* |
| *[Old Stack] SQLite (better-sqlite3)* | *Superseded by PostgreSQL on Neon.* |
| *[Old Stack] JWT + bcrypt passwords* | *Superseded by Google OAuth via Auth.js.* |
| *[Old Stack] Mocked keyword classifier* | *Superseded by Google Gemini Vision API.* |
| *[Old Stack] Multer disk uploads* | *Superseded by Vercel Blob cloud storage.* |

*(Note: Old stack rows are superseded by the Next.js / Postgres / Google OAuth / Gemini stack pivot — see updated rows above. Kept here for history.)*

---

## 📍 Current Project Status

- **Phase reached:** Phase 0 / Fresh start under Next.js + Neon + Google OAuth + Gemini stack in [`TASKS.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/TASKS.md).
- **What's working:** Full Next.js full-stack implementation completed and verified via `npm run build` (Prisma schema, Auth.js Google OAuth, Gemini classifier service, routing engine, complaints/department/public API routes, CSS Modules design system, and all 5 UI pages).
- **What's next / Ready for live connection:** Provide environment variables (`DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN`) to run `npm run prisma:push` and `npm run prisma:seed`.

---

## ❓ Open Questions

- **File Storage Selection**: Which file storage is permanently locked for production: Vercel Blob (currently implemented via `@vercel/blob` and `BLOB_READ_WRITE_TOKEN`) vs. Supabase Storage — currently running with Vercel Blob + dev data URI fallback.
- **Municipal Category Rules**: The ~11 seeded categories and SLA hours (`pothole=168h`, `garbage=48h`, `exposed_wiring=24h`) are realistic defaults, to be refined with city municipal partners in Phase 3.

---

## 🔒 Things Future Sessions Should NOT Re-Litigate

- **Auth is Google OAuth only**: No email/password option was deliberately excluded to avoid custom password management and credential storage risks; do not re-add passwords.
- **Top-Bar Navigation Only**: No sidebar navigation; keep the visual hierarchy focused on single-task cards and clear municipal data.
- **Isolated Classifier Contract**: The contract in `src/services/classifier.ts` (`{ category, severity, confidence, needsHumanReview }`) must remain decoupled from database schemas and routing logic.
