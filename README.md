# 🏛️ Civic-Sense — AI-Powered Civic Complaint Router

**Civic-Sense** is an intelligent civic complaint triage and public accountability platform. It eliminates manual triage delays through an automated AI classification layer (Google Gemini Vision) and guarantees radical municipal transparency with a real-time, tamper-proof public SLA (Service Level Agreement) performance dashboard.

---

## ⚡ Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router), TypeScript, React 18
- **Database**: [PostgreSQL on Neon](https://neon.tech/) (Serverless)
- **ORM**: [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [Auth.js (NextAuth v5)](https://authjs.dev/) with **Google OAuth** provider only (no passwords)
- **AI Classification**: [Google Gemini Vision API](https://ai.google.dev/) (`@google/generative-ai` `gemini-1.5-flash`)
- **File Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (`@vercel/blob`)
- **Styling**: Pure CSS Modules with USWDS-inspired municipal design tokens
- **Typography**: `Public Sans` (UI / body / headings) & `IBM Plex Mono` (SLA countdowns, IDs, metrics)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 📚 Documentation Suite

| Document | Purpose |
|---|---|
| 📄 **[`docs/PRD.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/PRD.md)** | **Product Requirements Document**: Problem statement, target personas, functional requirements, and MVP scope. |
| 🏗️ **[`docs/ARCHITECTURE.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/ARCHITECTURE.md)** | **System Design & Architecture**: Data flow diagrams, ER schema, state machine, and folder structure. |
| 🛡️ **[`docs/RULES.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/RULES.md)** | **Engineering Guardrails**: Non-negotiables, security boundaries, and coding standards. |
| 🎨 **[`docs/DESIGN.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/DESIGN.md)** | **UI Design Specification**: Municipal color palette, USWDS typography, and component specs. |
| 📋 **[`docs/TASKS.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/TASKS.md)** | **13-Phase Roadmap**: Build checklist and implementation milestones. |
| 🧠 **[`docs/MEMORY.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/MEMORY.md)** | **Project Ledger**: Running context, key architectural decisions, and status tracking. |

---

## 🚀 Key Features

1. **⚡ Zero-Triage AI Classification**: Automatic category, severity, and department routing upon photo/text submission via Gemini Vision.
2. **⏱️ Immutable SLA Timers**: Fixed deadlines computed at creation (`createdAt + slaHours`) with live countdown timers on citizen and public feeds.
3. **🔁 Linear State Machine**: Enforced unidirectional lifecycle (`SUBMITTED` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`) backed by an append-only `StatusHistory` audit ledger.
4. **📊 Public Watchdog Dashboard**: Zero-login city-wide metric tracking, department compliance scorecards, and an anonymized public feed.
5. **🛡️ Server-Side Role-Based Access Control**: All users default to `CITIZEN` upon Google sign-in. Staff and Admin privileges are assigned manually by system administrators via the protected `/admin` portal.

---

## 🛠️ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18+ or v20+ (Node v22 verified)
- **NPM**: v10+

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/Yuvi4242/Civic-Sense.git
cd Civic-Sense
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (referencing [`.env.example`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/.env.example)):

```env
# Database (PostgreSQL / Neon)
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"

# NextAuth / Auth.js (v5)
AUTH_SECRET="your-generated-auth-secret-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth Provider
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Classification (Google Gemini Vision API)
GEMINI_API_KEY="your-gemini-api-key"

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token"
```

### 4. Database Migration & Seeding
```bash
# Push schema to PostgreSQL database
npm run prisma:push

# Seed municipal departments and category SLA rules
npm run prisma:seed
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
civic-sense/
├── prisma/
│   ├── schema.prisma                 # Database schema models & enums
│   └── seed.js                       # Seed script for departments & SLA rules
├── src/
│   ├── app/                          # Next.js App Router (pages & API handlers)
│   │   ├── api/
│   │   │   ├── admin/users/          # Admin role promotion API
│   │   │   ├── auth/[...nextauth]/   # Auth.js Google OAuth route
│   │   │   ├── complaints/           # Complaint submission & staff listing
│   │   │   │   ├── [id]/status/      # Status state machine mutation
│   │   │   │   └── mine/             # Citizen personal complaints
│   │   │   ├── departments/          # Department catalog
│   │   │   └── public/               # Zero-login public stats & feed
│   │   │       ├── stats/
│   │   │       ├── departments-performance/
│   │   │       └── complaints/
│   │   ├── admin/                    # Admin role assignment portal
│   │   ├── dashboard/                # Public accountability dashboard
│   │   ├── department/               # Staff triage & action queue
│   │   ├── login/                    # Google OAuth sign-in
│   │   ├── report/                   # Citizen report & tracker
│   │   ├── globals.css               # Design system tokens & base CSS
│   │   ├── layout.tsx                # Font loader (Public Sans, IBM Plex Mono)
│   │   └── page.tsx                  # Landing page
│   ├── components/                   # Shared UI components
│   │   ├── AuthProvider.tsx          # NextAuth session context
│   │   ├── Navbar.tsx                # Navigation header
│   │   ├── SeverityChip.tsx          # Severity badges
│   │   ├── SlaCountdown.tsx          # Live SLA countdown ticker
│   │   └── StatusChip.tsx            # Status pills
│   ├── lib/
│   │   └── prisma.ts                 # Prisma Client singleton
│   ├── services/
│   │   ├── classifier.ts             # Isolated Gemini Vision classifier
│   │   └── routingEngine.ts          # Department routing & SLA calculator
│   └── types/
│       └── next-auth.d.ts            # Auth.js type augmentations
├── docs/                             # Complete project documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── RULES.md
│   ├── DESIGN.md
│   ├── TASKS.md
│   └── MEMORY.md
└── package.json
```

---

## 🔒 Security & Privacy Invariants

- **Zero Exposure of Citizen Identity**: Public endpoints never return `citizenId`, citizen names, or email addresses.
- **Server-Side Authorization**: Every status change and complaint mutation verifies JWT credentials and departmental jurisdiction on the server.
- **Tamper-Proof SLAs**: SLA deadlines are locked at creation and computed live, preventing municipal departments from masking overdue breaches.
