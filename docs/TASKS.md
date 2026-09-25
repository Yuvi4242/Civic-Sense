# Tasks & Implementation Checklist
## Project: Civic-Sense

**Purpose:** Phased execution checklist. Work top to bottom — later phases depend on earlier ones being functional and verified.

Mark tasks `[x]` as they are completed.

---

## 🏗️ Phase 0 — Environment & Project Setup
- [x] Provision Neon Postgres database URL, Google Cloud OAuth app credentials, and Gemini API key template
- [x] Scaffold Next.js 14+ App Router project with TypeScript (`package.json`, `tsconfig.json`, `next.config.js`)
- [x] Install core dependencies (`@prisma/client`, `prisma`, `next-auth@beta`, `@auth/prisma-adapter`, `@google/generative-ai`, `@vercel/blob`)
- [x] Configure `.env.example`, `.gitignore`, and minimal `postcss.config.js`

## 🗄️ Phase 1 — Database Architecture & Seed Script
- [x] Build `prisma/schema.prisma`: `User`, `Account`, `Session`, `VerificationToken`, `Department`, `CategoryRule`, `Complaint`, `StatusHistory`
- [x] Run Prisma generation (`npx prisma generate`) and database schema push
- [x] Write and run seed script (`prisma/seed.js`):
  - [x] Seed 6 departments (`Roads & Infrastructure`, `Sanitation`, `Electrical`, `Water Supply & Drainage`, `Parks & Environment`, `General / Unclassified`)
  - [x] Seed ~11 CategoryRule mappings with SLA hours

## 🔐 Phase 2 — Authentication (Google OAuth via Auth.js)
- [x] Wire up Auth.js (NextAuth v5) with Google provider in `src/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts`
- [x] Implement database session and JWT callbacks: default new sign-ins to `role: CITIZEN` with `departmentId: null`
- [x] Verify session attaches fresh `role` and `departmentId` from database

## 👑 Phase 3 — Admin Role Assignment Mechanism
- [x] Build `GET /api/admin/users` (ADMIN role only)
- [x] Build `PATCH /api/admin/users` for role (`CITIZEN`, `DEPARTMENT_STAFF`, `ADMIN`) and department assignment
- [x] Build `/admin` page for managing staff/admin permissions before building staff-dependent features

## 🤖 Phase 4 — AI Classifier Service (Gemini Vision)
- [x] Build `src/services/classifier.ts` with isolated contract:
  ```typescript
  classifyComplaint(photoUrl: string, description: string): Promise<{
    category: string,
    severity: 'MINOR' | 'MODERATE' | 'SEVERE',
    confidence: number,
    needsHumanReview: boolean
  }>
  ```
- [x] Implement Gemini Vision API integration with JSON parsing, error handling, and heuristic fallback
- [x] Test classifier in isolation with sample image and text descriptions

## ⏱️ Phase 5 — Routing & SLA Engine
- [x] Build `src/services/routingEngine.ts`:
  - [x] `routeComplaint(category)`: lookup `CategoryRule` or fallback to 'other'
  - [x] `calculateDeadline(createdAt, slaHours)`: immutable deadline computation

## 📝 Phase 6 — Complaint Submission API
- [x] Build `POST /api/complaints`: photo upload (Vercel Blob / data URI) $\rightarrow$ AI classification $\rightarrow$ department routing $\rightarrow$ SLA deadline $\rightarrow$ transactional insert of `Complaint` and initial `StatusHistory`
- [x] Build `GET /api/complaints/mine` for authenticated citizen's complaints
- [x] Test complaint submission end-to-end

## 👷 Phase 7 — Department Status Workflow API
- [x] Build `GET /api/complaints`: scoped to `session.user.departmentId` for staff, all for admin
- [x] Build `PATCH /api/complaints/:id/status`: server-side state machine check (`SUBMITTED` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`), department ownership check, resolution proof photo handling, and immutable `StatusHistory` logging

## 📊 Phase 8 — Public API Routes
- [x] Build `GET /api/public/stats`: total, open, resolved, active SLA breaches (NO AUTH)
- [x] Build `GET /api/public/departments-performance`: department scorecard with resolution time and compliance rate (NO AUTH)
- [x] Build `GET /api/public/complaints`: filterable feed strictly stripped of citizen identity (NO AUTH)
- [x] Build `GET /api/departments`: list municipal departments

## 🎨 Phase 9 — Shared Layout & CSS Modules Design System
- [x] Configure CSS variables (`--ink`, `--paper`, `--amber`, `--brick`, `--forest`) in `src/app/globals.css`
- [x] Load Google Fonts **Public Sans** and **IBM Plex Mono** in `src/app/layout.tsx`
- [x] Build reusable components: `Navbar`, `StatusChip`, `SeverityChip`, `SlaCountdown`

## 🚪 Phase 10 — Landing & Login Pages
- [x] Build `/` (`src/app/page.tsx`) landing page with civic value proposition, CTAs, and 4-step workflow
- [x] Build `/login` (`src/app/login/page.tsx`) with Google Sign-in button wrapped in `Suspense`

## 📱 Phase 11 — Citizen Flow (/report)
- [x] Build `/report` (`src/app/report/page.tsx`): submission form with camera upload and auto GPS capture
- [x] Show inline AI classification result card immediately upon submission
- [x] Build "My Complaints" tab with live SLA countdown tickers

## 🛠️ Phase 12 — Department Staff Flow (/department)
- [x] Build `/department` (`src/app/department/page.tsx`): department queue with status filter
- [x] Render single next-action button per row matching valid transition
- [x] Build resolution modal for notes and proof photo upload

## 🌐 Phase 13 — Public Dashboard (/dashboard) & Full E2E Verification
- [x] Build `/dashboard` (`src/app/dashboard/page.tsx`): stat cards, department scorecard table, filterable feed
- [x] Run full end-to-end verification and production build check (`npm run build`)

---

## 📜 Superseded — Old Stack (Preserved for History)
- [ ] *[Node/Express]* `npm init` and install: express, better-sqlite3, bcryptjs, jsonwebtoken, multer, cors, dotenv
- [ ] *[SQLite]* Write `db/schema.sql` and `db/database.js` SQLite connection
- [ ] *[Password Auth]* Build `POST /api/auth/register` and `POST /api/auth/login` with bcrypt passwords
- [ ] *[Mock AI]* Mock keyword classification service in plain JS
- [ ] *[Vanilla Frontend]* Build `public/index.html`, `public/report.html`, `public/department.html`, `public/public-dashboard.html` without framework
