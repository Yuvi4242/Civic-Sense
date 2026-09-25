# Product Requirements Document (PRD)
## Project: Civic-Sense
### AI-Powered Civic Complaint Router

**Version:** 1.0  
**Status:** Draft — MVP Scope  
**Owner:** Yuvi4242  

---

## 1. Problem Statement

Citizens already have ways to report civic issues (potholes, garbage, broken streetlights) — but existing complaint apps fail in two consistent ways:

1. **No intelligent classification:** A human has to read every complaint and manually decide which department it belongs to. This is slow, inconsistent, and doesn't scale.
2. **No public accountability:** Once submitted, a complaint disappears into a black hole. The citizen doesn't know if anyone is working on it, how long it "should" take, or whether the responsible department is actually performing.

**Civic-Sense** solves both:
- An **AI classification layer** that auto-routes reports to the correct department.
- A **public SLA (Service Level Agreement) dashboard** that makes department performance visible to everyone — not just the person who filed the complaint.

---

## 2. Goals & Objectives

| Goal | How we measure it |
|---|---|
| Reduce time-to-route a complaint to zero manual triage | % of complaints auto-routed without human intervention (Target: 100%) |
| Give every complaint a public, enforceable deadline | 100% of complaints have an SLA deadline set at creation |
| Create real accountability pressure on departments | Public dashboard is live, accurate, and cannot be edited by departments to hide breaches |
| Keep the MVP buildable by one developer in weeks, not months | Core loop (report → classify → route → resolve → track) works end-to-end before anything else is added |

### Non-goals (explicitly out of scope for MVP)
- Payment processing or fines
- Multi-city / multi-tenant support (single city/municipality only)
- Native mobile apps (web-first, mobile-responsive design)
- Real-time chat between citizen and department
- Multi-language support (English only for MVP)

---

## 3. Target Users & Personas

### Persona 1: The Citizen — "Riya"
- Wants to report a pothole near her house in under 2 minutes.
- Doesn't want to create an account with a long form, doesn't want to pick a department herself (she doesn't know which one is responsible).
- Wants to know if anyone is actually going to fix it, and by when.

### Persona 2: Department Staff — "Anil, Roads & Infrastructure"
- Logs in once a day to see what's assigned to his department.
- Needs to update status quickly (a few taps), not fill out long forms.
- Doesn't want complaints for other departments cluttering his queue.

### Persona 3: The Public / Watchdog — "Any citizen or journalist"
- Never logs in.
- Wants to see which departments are missing their deadlines.
- Wants to see this without needing to file a complaint themselves.

---

## 4. Core User Flows

### Flow A — Citizen reports an issue
1. Citizen opens the site (no login required to browse, login required to submit).
2. Taps **"Report an issue"**.
3. Takes/uploads a photo, adds a short description, allows location access.
4. Submits — sees classification result (category, severity, department, SLA deadline) within a few seconds.
5. Can view this and all past complaints under **"My Complaints"** with a live countdown timer.

### Flow B — Department resolves a complaint
1. Staff logs in, sees only complaints assigned to their department.
2. Filters by status (`submitted` / `acknowledged` / `in_progress` / `resolved`).
3. Opens a complaint, moves it to the next status in sequence (`submitted` → `acknowledged` → `in_progress` → `resolved`).
4. On resolving, can attach a "proof of resolution" photo.

### Flow C — Public accountability check
1. Anyone visits the public dashboard (no login required).
2. Sees city-wide totals: total complaints, open, resolved, active SLA breaches.
3. Sees a per-department performance table: total, open, resolved, average resolution time, active breaches, resolved-late counts.
4. Can filter/browse the full complaint feed by status, department, and category.

---

## 5. Functional Requirements

### 5.1 Authentication & Authorization
- **FR-1:** All authentication is handled via Google OAuth using Auth.js (NextAuth v5) — no passwords or custom credential forms.
- **FR-2:** On first Google sign-in, every user is provisioned with `role = CITIZEN` and `departmentId = null` by default.
- **FR-3:** Department staff and admin privileges cannot be self-assigned. Promoting a user to `DEPARTMENT_STAFF` or `ADMIN` requires manual assignment by an administrator via a protected mechanism.
- **FR-4:** Department staff accounts are role-scoped to exactly one department; server-side session checks verify `role` and `departmentId` from the database session on every request.

### 5.2 Complaint Submission
- **FR-5:** Citizen can submit a complaint with: photo (optional but encouraged), text description, GPS coordinates (auto-captured), optional address/landmark.
- **FR-6:** System runs AI classification on submission and returns category, severity, and a confidence score.
- **FR-7:** If confidence is below a defined threshold, the complaint is flagged `needsHumanReview` but still routed normally (never blocks submission).
- **FR-8:** Every submission is immediately assigned a department and an SLA deadline — this must never require manual triage.

### 5.3 Routing & SLA
- **FR-9:** Each complaint category maps to exactly one department and one SLA duration (in hours), stored in a rules table — editable without code changes.
- **FR-10:** SLA deadline = `submission timestamp + category's SLA hours`, fixed at creation time (does not silently shift).
- **FR-11:** A complaint's SLA status (on track / breached) is computed live, never stored as a stale flag.

### 5.4 Status Lifecycle
- **FR-12:** Status moves strictly forward: `SUBMITTED` → `ACKNOWLEDGED` → `IN_PROGRESS` → `RESOLVED`. No skipping steps, no going backward.
- **FR-13:** Only staff belonging to the assigned department (or admin) can change a complaint's status.
- **FR-14:** Every status change is logged with a timestamp and the user who made it (immutable audit trail).
- **FR-15:** Marking "resolved" allows (not requires) attaching a proof photo.

### 5.5 Public Dashboard
- **FR-16:** No authentication required to view.
- **FR-17:** Shows city-wide totals: total / open / resolved / active breaches.
- **FR-18:** Shows per-department table: total, open, resolved, average resolution time, active breaches, resolved-late count.
- **FR-19:** Shows a filterable feed of all complaints (by status, department, category) with photo, category, department, status, and SLA countdown.
- **FR-20:** Citizen identity is never exposed on the public dashboard.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Complaint submission (including classification) responds in under 3 seconds |
| **Availability** | Public dashboard must stay readable even if classification service is degraded |
| **Data Integrity** | Status history and SLA deadlines are append-only / immutable once set |
| **Security** | Role-based access control (RBAC) enforced server-side on every request, not just hidden in the UI |
| **Usability** | Citizen can submit a complaint in under 5 taps/clicks from landing page |
| **Portability** | Runs as a single deployable service; no proprietary cloud lock-in for MVP |

---

## 7. AI Classification — Gemini Vision Pipeline

AI classification is powered directly by **Google Gemini Vision API** via `@google/generative-ai` (`gemini-1.5-flash`). To preserve architectural cleanliness and maintain testing flexibility, the classification step is built as an **isolated, swappable module** (`src/services/classifier.ts`) with a fixed interface contract:

```typescript
interface ClassificationResult {
  category: string;                       // Matches a category in CategoryRule
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';
  confidence: number;                     // 0.0 to 1.0
  needsHumanReview: boolean;              // true if confidence < 0.55
}

async function classifyComplaint(
  photoUrl: string,
  description: string
): Promise<ClassificationResult>;
```

Internally, the classifier analyzes the image buffer/URL and description, returning structured JSON. If the output is unparseable or outside known categories, it falls back gracefully to `category = 'other'` and `needsHumanReview = true` rather than crashing the request. Downstream routing and SLA calculation depend only on this exported contract.

---

## 8. High-Level Data Model (Prisma Conventions)

- **User**: `id`, `name`, `email`, `image`, `role` (`CITIZEN` | `DEPARTMENT_STAFF` | `ADMIN`), `departmentId`, `createdAt`, `updatedAt`
- **Department**: `id`, `name`, `description`
- **CategoryRule**: `id`, `category`, `departmentId`, `slaHours`
- **Complaint**: `id`, `citizenId`, `description`, `photoUrl`, `resolvedPhotoUrl`, `latitude`, `longitude`, `addressText`, `category`, `severity` (`MINOR` | `MODERATE` | `SEVERE`), `confidence`, `needsHumanReview`, `departmentId`, `slaHours`, `slaDeadline`, `status` (`SUBMITTED` | `ACKNOWLEDGED` | `IN_PROGRESS` | `RESOLVED`), `createdAt`, `acknowledgedAt`, `inProgressAt`, `resolvedAt`
- **StatusHistory**: `id`, `complaintId`, `status`, `note`, `changedById`, `changedAt`

---

## 9. Success Metrics (MVP)

- 100% of submitted complaints receive automatic classification + routing + SLA deadline with zero manual intervention.
- Public dashboard numbers update within seconds of any status change.
- Zero cases of a department seeing/editing another department's complaints.
- End-to-end loop (submit → classify → route → resolve → reflect publicly) works reliably.

---

## 10. Roadmap & Phasing

### Phase 1 (MVP)
- Auth & RBAC via Google OAuth (Citizen, Department Staff, Admin).
- Complaint submission with Gemini Vision AI classification.
- Dynamic routing engine + SLA deadline computation.
- Department workflow dashboard (strictly forward lifecycle progression).
- Public SLA accountability dashboard with live breach calculation and anonymized feed.

### Phase 2
- Interactive Map View (Leaflet / OpenStreetMap).
- Automated notifications (Email/SMS/Webhooks) on status transitions & impending SLA breaches.

### Phase 3
- Administrative management portal for dynamic category-to-department rules and SLA adjustments.
- Multi-language localization (i18n).
- Seasonal analytics, hotspot heatmaps, and department SLA compliance scoring.

---

## 11. Assumptions & Constraints

- Single city/municipality per deployment (no multi-tenancy in MVP).
- English-only content in MVP.
- Citizens must sign in with Google to submit (to mitigate spam and enable tracking).
- Department accounts are provisioned by an administrator.

---

## 12. Risk Management

| Risk | Impact | Mitigation |
|---|---|---|
| AI classifier misroutes complaints | Medium | Low-confidence results (< 0.55 threshold) flag `needsHumanReview` without blocking routing |
| Department staff gaming performance metrics | High | Status transitions are strictly forward and logged to an immutable audit trail; SLA breach computations are dynamic |
| Spam / fake report flood | Medium | Google OAuth verification required; image upload size caps; rate limiting |
