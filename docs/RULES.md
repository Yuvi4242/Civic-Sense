# Rules & Engineering Guardrails
## Project: Civic-Sense

**Purpose:** The guardrails for how this codebase is built — for human engineers and AI pair-programmers. When in doubt, these rules win over convenience.

---

## 1. 🛡️ Non-Negotiables (Never Break These)

1. **Every write endpoint checks auth + role server-side.** Never rely on the frontend hiding a button as the only access control.
2. **A department staff account only ever sees/modifies complaints where `complaint.departmentId === session.user.departmentId`.** Check this in the query and the handler on every single request — not once at login.
3. **Status transitions only move strictly forward**, exactly as defined in [`ARCHITECTURE.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/ARCHITECTURE.md) (`SUBMITTED` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`). Reject any other transition with a `400 Bad Request` server-side.
4. **The public dashboard never returns citizen identity** — no citizen name, email, or `citizenId` in any `/api/public/*` response, ever.
5. **OAuth secrets, API keys, and sessions are strictly protected.** Never expose or log `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, or `DATABASE_URL`. Every server-side check must read `role` and `departmentId` from the database session via Auth.js, never trusting a client-sent value.
6. **No code path may allow self-promotion.** No user can set their own role to `DEPARTMENT_STAFF` or `ADMIN`. On first Google sign-in, users are always `CITIZEN`. Staff and Admin privileges must be assigned manually by an administrator via the protected `/api/admin/users` mechanism.
7. **SLA deadlines, once set, are immutable.** Don't recalculate or shift a deadline after creation — that defeats the entire public accountability purpose of the project.
8. **The classifier service (`src/services/classifier.ts`) only ever returns** `{ category, severity, confidence, needsHumanReview }`. Nothing outside that file should know *how* classification happens — only what it returns.

---

## 2. 📂 Code Organization Rules

- **Separation of Concerns**: New business logic goes in `src/services/`, not directly in route handlers. Route handlers in `src/app/api/` should read as: `validate input` $\rightarrow$ `call a service` $\rightarrow$ `return a response`.
- **Database Access**: All database operations go through the shared Prisma client in `src/lib/prisma.ts`.
- **Architectural Alignment**: If you're not sure which folder a piece of code belongs in, check [`ARCHITECTURE.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/ARCHITECTURE.md) (`src/app`, `src/components`, `src/services`, `src/lib`, `src/types`).
- **Single Responsibility Principle**: One file, one responsibility. If `src/app/api/complaints/route.ts` starts handling Gemini prompt tuning directly, that logic has leaked out of `classifier.ts` and needs to move back.

---

## 3. 🏷️ Naming Conventions

| What | Convention | Example |
|---|---|---|
| Prisma Models | `PascalCase`, singular | `User`, `CategoryRule`, `Complaint`, `StatusHistory` |
| Prisma Fields / DB Columns | `camelCase` | `slaDeadline`, `needsHumanReview`, `citizenId` |
| JS/TS variables/functions | `camelCase` | `routeComplaint`, `slaDeadline`, `classifyComplaint` |
| API routes | `kebab-case`, Next.js App Router | `src/app/api/complaints/[id]/status/route.ts` |
| Status / Enum values | `SCREAMING_SNAKE_CASE` | `SUBMITTED`, `ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED` |
| Services / Helpers | `camelCase.ts` | `src/services/routingEngine.ts`, `src/services/classifier.ts` |

> [!NOTE]
> Keep status and category enum string values **identical** across Prisma, backend route handlers, and frontend components. If the frontend needs a display label (e.g. "In Progress" instead of `IN_PROGRESS`), format it at render time.

---

## 4. ⚠️ Error Handling Contract

- Every API error response must conform to `{ error: "human-readable message" }`.
- Never return a raw database error or stack trace to the client.
- **Validation errors** (missing fields, illegal status transition) $\rightarrow$ `400 Bad Request`
- **Authentication errors** (missing/invalid session token) $\rightarrow$ `401 Unauthorized`
- **Permission errors** (valid user, wrong role/department) $\rightarrow$ `403 Forbidden`
- **Not found** $\rightarrow$ `404 Not Found`
- **Unexpected server errors** $\rightarrow$ `500 Internal Server Error`, logged server-side with full detail, but presenting only a generic message to the client.

---

## 5. 🖥️ Frontend Engineering Rules

- No business logic in the frontend beyond form validation and display formatting. If the frontend is computing an SLA deadline or deciding a valid status transition, that logic is misplaced.
- Every authenticated page checks the session on load and redirects to `/login` if missing.
- Use **CSS Modules only** with the design system tokens (`--ink`, `--paper`, `--amber`, `--brick`, `--forest`) and typography (`Public Sans`, `IBM Plex Mono`).

---

## 6. 🤖 AI Pair-Programming Rules

- Always re-read [`PRD.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/PRD.md) and [`ARCHITECTURE.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/ARCHITECTURE.md) before generating new features — do not allow scope creep.
- When asked to "add a feature," check [`TASKS.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/TASKS.md) first — if it's not listed under the current phase, flag that instead of silently expanding scope.
- **Gemini Vision Contract**: Never modify `src/services/classifier.ts`'s exported function signature contract. Never hardcode or log `GEMINI_API_KEY`.
- When generating database queries, always filter by the requesting user's role and `departmentId` — do not generate queries that return unfiltered data and rely on the frontend to hide it.
- Update [`MEMORY.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/MEMORY.md) after any significant decision or completed phase.

---

## 7. 🌿 Git & Repository Hygiene

- Commit messages describe the *why*, not just the *what* (e.g., `Add SLA breach calculation to public dashboard` rather than `update code`).
- One logical change per commit — don't bundle unrelated fixes into a feature commit.
- **Never commit `.env.local`, `.env`**, or any files containing `DATABASE_URL`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, or `BLOB_READ_WRITE_TOKEN`.

---

## 8. ✅ Definition of "Done"

A feature is considered done only when:
1. It works through the actual browser UI, not just via curl/Postman.
2. Server-side validation rejects invalid input.
3. Role/permission checks are enforced server-side.
4. It does not break public dashboard metrics.
5. It is marked complete in [`TASKS.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/TASKS.md).
