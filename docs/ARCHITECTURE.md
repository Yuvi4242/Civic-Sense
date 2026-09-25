# 🏛️ Architecture & System Design Document
## Project: Civic-Sense
### AI-Powered Civic Complaint Router & Public Accountability Platform

**Version:** 1.0  
**Status:** Approved — MVP Architecture  
**Companion to:** [`PRD.md`](file:///c:/Users/yuvra/OneDrive/Desktop/CivicSense/docs/PRD.md)  
**Purpose:** Technical blueprint detailing system components, request flows, database schema, state machines, folder structure, and security boundaries.

---

## 1. 🌐 System Overview & Architecture Diagram

Civic-Sense is architected as a **modular monolith** web application serving three distinct user surfaces (Citizen, Department Staff, and Public Watchdog) from a single codebase and database. This keeps deployment, execution, and local development zero-overhead and highly reliable without unnecessary distributed complexity.

```mermaid
flowchart TB
    %% User Personas & Surfaces
    subgraph Users["👥 User Surfaces"]
        Citizen["👤 Citizen<br/>• Reports Issues<br/>• Captures GPS & Photos<br/>• Tracks Live Countdown"]
        Staff["👷 Department Staff<br/>• Role-Scoped Queue<br/>• Linear State Machine<br/>• Proof of Resolution"]
        Public["👀 General Public / Watchdog<br/>• Zero-Login Dashboard<br/>• Live Breach Tracking<br/>• Anonymized Feed"]
    end

    %% Application Core
    subgraph App["⚡ Civic-Sense Application Core"]
        Frontend["🖥️ Frontend Client<br/>(Clean Responsive Web UI)"]
        API["🚪 Express API Gateway<br/>(JWT Auth, RBAC, Validation)"]
        
        subgraph Engine["🧩 Business & AI Subsystems"]
            Classifier["🤖 AI Classification Service<br/>(Modular Input/Output Contract)"]
            Routing["⏱️ Routing & SLA Engine<br/>(Rules Lookup & SLA Calculation)"]
        end
    end

    %% Storage Layer
    subgraph Storage["💾 Persistence & File Storage Layer"]
        DB[("🗄️ Database (SQLite / Postgres)<br/>Users, Complaints, Departments,<br/>Category Rules, Status History")]
        DiskStorage[("📁 File Storage (Uploads)<br/>Complaint & Resolution Proof Photos")]
    end

    %% Interactions
    Citizen -->|Submits report / Views status| Frontend
    Staff -->|Updates status in sequence| Frontend
    Public -->|Views real-time accountability metrics| Frontend

    Frontend -->|REST API Calls| API
    API -->|1. Raw photo + description| Classifier
    Classifier -->|2. Category + Severity + Confidence| Routing
    Routing -->|3. Fetch rules & compute SLA deadline| DB
    Routing -->|4. Routed payload| API
    API -->|5. Insert record & audit history| DB
    API -->|Save photo files| DiskStorage
```

---

## 2. 🎯 Component Responsibilities & Boundaries

To preserve architectural integrity and support swapping in multimodal vision AI models later, strict component boundaries are enforced:

| Component | Core Responsibility | 🚫 Strict Constraints (Must NOT Do) |
|---|---|---|
| **🖥️ Frontend** | Render responsive UI, capture GPS/photos, trigger API requests, render SLA countdown timers | Contain business logic, calculate SLA deadlines, or bypass backend permission checks |
| **🚪 API Layer** | Authenticate JWTs, enforce RBAC, sanitize inputs, coordinate services, transaction management | Talk to DB using ad-hoc raw queries outside designated data access routines |
| **🤖 Classifier Service** | Receive photo + description $\rightarrow$ return `{ category, severity, confidence, needs_human_review }` | Know anything about department IDs, SLA hours, user accounts, or database tables |
| **⏱️ Routing & SLA Engine** | Receive `category` $\rightarrow$ lookup department, compute immutable `sla_deadline` | Know anything about image buffers, ML heuristics, or user sessions |
| **🗄️ Database** | Persist entities, enforce foreign key integrity, store append-only audit trail | Store complex business logic or mutate calculated audit timestamps |

> [!IMPORTANT]
> **Why this separation matters:** The classifier is the single component most likely to evolve (from keyword/heuristic regex to multimodal LLMs/Vision APIs). Because it adheres strictly to a standardized input/output contract, swapping the AI model requires updating **exactly one file** (`services/classifier.js`) without changing database schemas, routing rules, or frontend dashboards.

---

## 3. 🔄 Request Flow: Citizen Submits a Complaint

The complaint submission flow is synchronous, deterministic, and executes in under 3 seconds end-to-end:

```mermaid
sequenceDiagram
    autonumber
    actor C as 👤 Citizen (Browser)
    participant A as 🚪 API Server (/api/complaints)
    participant AI as 🤖 Classifier Service
    participant R as ⏱️ Routing & SLA Engine
    participant DB as 🗄️ Database
    participant FS as 📁 Disk Storage

    C->>A: POST /api/complaints (Photo + Description + Coordinates)
    A->>A: Verify JWT token & assert Role === 'citizen'
    A->>FS: Save uploaded photo to /uploads/complaints/
    A->>AI: classifyComplaint({ photoPath, description })
    AI-->>A: Return { category, severity, confidence, needs_human_review }
    
    A->>R: routeComplaint(category)
    R->>DB: SELECT department_id, sla_hours FROM category_rules WHERE category = ?
    DB-->>R: Return { department_id, sla_hours }
    R->>R: Calculate sla_deadline = now() + (sla_hours * 3600s)
    R-->>A: Return { department_id, sla_hours, sla_deadline }

    A->>DB: BEGIN TRANSACTION
    A->>DB: INSERT INTO complaints (...) VALUES (status='submitted')
    A->>DB: INSERT INTO status_history (complaint_id, status='submitted', changed_by)
    A->>DB: COMMIT TRANSACTION
    DB-->>A: Complaint Created (ID: uuid/int)
    
    A-->>C: 201 Created — { id, category, department, severity, sla_deadline, status }
```

---

## 4. 🔄 Request Flow: Department Staff Status Update

Status progression is strictly forward and guarded by role-based ownership checks:

```mermaid
sequenceDiagram
    autonumber
    actor S as 👷 Staff Member (Browser)
    participant A as 🚪 API Server (/api/complaints/:id/status)
    participant DB as 🗄️ Database
    participant FS as 📁 Disk Storage

    S->>A: PATCH /api/complaints/:id/status { next_status, note, proofPhoto? }
    A->>A: Verify JWT & extract { userId, role, userDepartmentId }
    A->>DB: SELECT * FROM complaints WHERE id = ?
    DB-->>A: Return complaint record

    Note over A: 🛡️ Guard 1: Department Ownership<br/>complaint.department_id === userDepartmentId (or admin)
    Note over A: 🛡️ Guard 2: Valid State Progression<br/>submitted -> acknowledged -> in_progress -> resolved

    alt Invalid Department or Illegal Transition
        A-->>S: 403 Forbidden / 400 Bad Request (Invalid Transition)
    else Authorized & Valid Transition
        opt If resolving & proof photo attached
            A->>FS: Save proof photo to /uploads/resolutions/
        end
        A->>DB: BEGIN TRANSACTION
        A->>DB: UPDATE complaints SET status = next_status, [status]_at = now()
        A->>DB: INSERT INTO status_history (complaint_id, status, note, proof_photo, changed_by)
        A->>DB: COMMIT TRANSACTION
        DB-->>A: Update Confirmed
        A-->>S: 200 OK — Updated Complaint Object & Audit Entry
    end
```

---

## 5. 🗄️ Database Schema & Entity-Relationship Design

The schema enforces strict referential integrity, role scoping, and an immutable audit trail.

```mermaid
erDiagram
    USERS ||--o{ COMPLAINTS : "files (citizen)"
    USERS ||--o{ STATUS_HISTORY : "triggers (audit)"
    DEPARTMENTS ||--o{ USERS : "employs (staff)"
    DEPARTMENTS ||--o{ CATEGORY_RULES : "handles"
    DEPARTMENTS ||--o{ COMPLAINTS : "assigned_to"
    COMPLAINTS ||--o{ STATUS_HISTORY : "tracks_audit_trail"

    USERS {
        int id PK "Auto Increment"
        string name "Full Name"
        string email UK "Unique Login Identifier"
        string password_hash "bcrypt hashed"
        string role "citizen | department_staff | admin"
        int department_id FK "Nullable (Null for Citizens)"
        datetime created_at "Account creation timestamp"
    }

    DEPARTMENTS {
        int id PK "Auto Increment"
        string name UK "Department Name (e.g., Roads, Sanitation)"
        string code UK "Short Code (e.g., RDS, SNT, ELE)"
        string description "Scope of responsibility"
        string contact_email "Official contact"
    }

    CATEGORY_RULES {
        int id PK "Auto Increment"
        string category UK "Pothole, Garbage, Streetlight, etc."
        int department_id FK "Assigned Department"
        int sla_hours "Default SLA resolution window (hrs)"
        string keywords "JSON array / comma list for AI classifier"
    }

    COMPLAINTS {
        int id PK "Auto Increment / UUID"
        int citizen_id FK "Submitting Citizen ID"
        string description "Complaint text description"
        string photo_path "Uploaded issue photo URL"
        string resolved_photo_path "Proof of resolution photo URL"
        float latitude "GPS Latitude"
        float longitude "GPS Longitude"
        string address_text "Optional landmark / address"
        string category "AI Classified Category"
        string severity "minor | moderate | severe"
        float confidence "AI Confidence Score (0.00 - 1.00)"
        boolean needs_human_review "Low confidence triage flag"
        int department_id FK "Assigned Department"
        int sla_hours "Locked SLA duration"
        datetime sla_deadline "Computed: created_at + sla_hours"
        string status "submitted | acknowledged | in_progress | resolved"
        datetime created_at "Creation timestamp"
        datetime acknowledged_at "Timestamp of acknowledgement"
        datetime in_progress_at "Timestamp work began"
        datetime resolved_at "Timestamp resolution confirmed"
    }

    STATUS_HISTORY {
        int id PK "Auto Increment"
        int complaint_id FK "Associated Complaint"
        string status "New status applied"
        string note "Optional staff / admin remarks"
        string proof_photo_path "Proof photo URL (optional)"
        int changed_by FK "User ID who enacted change"
        datetime changed_at "Immutable transition timestamp"
    }
```

> [!TIP]
> **Why `status_history` is critical:** The `status_history` table serves as an append-only ledger. The public dashboard computes average resolution times and breach statistics directly from historical logs, preventing departments from altering past records or manipulating metrics.

---

## 6. 🔁 Status Lifecycle State Machine

The complaint status transitions strictly forward along an enforced progression pipeline:

```mermaid
stateDiagram-v2
    [*] --> submitted : 👤 Citizen submits complaint<br/>(SLA deadline locked immediately)
    
    submitted --> acknowledged : 👷 Staff reviews & acknowledges
    note right of submitted
        • SLA Clock is actively running
        • Category & Department locked
    end note

    acknowledged --> in_progress : 👷 Field team dispatched
    note right of acknowledged
        • Live countdown visible to Citizen & Public
    end note

    in_progress --> resolved : 👷 Issue resolved (+ optional proof photo)
    note right of in_progress
        • Transition records resolved_at timestamp
    end note

    resolved --> [*]
    note right of resolved
        • SLA Performance evaluated:
          resolved_at <= sla_deadline (On Time ✅)
          resolved_at > sla_deadline (Breached ❌)
    end note
```

- **Invariant 1:** Cannot transition backward (e.g., `in_progress` cannot revert to `submitted`).
- **Invariant 2:** Cannot skip intermediate states (e.g., cannot jump from `submitted` directly to `resolved`).
- **Invariant 3:** Transitions are verified and logged server-side with user identity stamps.

---

## 7. 📁 Project Folder & File Structure

```
civic-sense/
├── server.js                     # Main application entry point
├── db/
│   ├── schema.sql                 # DDL definitions (tables, indices, foreign keys)
│   ├── database.js                # SQLite connection pool & migration runner
│   └── seed.js                    # Demo seed data (departments, rules, test users)
├── services/
│   ├── classifier.js              # AI classification service (swappable adapter)
│   ├── routingEngine.js           # Category-to-Department & SLA calculation engine
│   └── slaService.js              # Live SLA breach evaluation & metrics calculator
├── middleware/
│   ├── auth.js                    # JWT token extraction & verification
│   ├── rbac.js                    # Role guards (citizen, department_staff, admin)
│   └── upload.js                  # Multer disk upload handler & file type validator
├── routes/
│   ├── auth.js                    # /api/auth (register, login, me)
│   ├── complaints.js              # /api/complaints (submit, list, getById, updateStatus)
│   ├── departments.js             # /api/departments (list departments & queues)
│   └── public.js                  # /api/public (city metrics, department stats, live feed)
├── public/                        # Lightweight responsive web frontend
│   ├── index.html                 # Hero landing page & navigation
│   ├── login.html                 # Login & Registration modal/page
│   ├── report.html                # Citizen reporting wizard with GPS & Camera
│   ├── my-complaints.html         # Citizen personal tracking dashboard
│   ├── department.html            # Department staff triage & action portal
│   ├── public-dashboard.html      # Public watchdog performance dashboard
│   ├── css/
│   │   ├── main.css               # Global styles, typography & color variables
│   │   └── components.css         # Cards, badges, SLA countdown tickers, steppers
│   └── js/
│       ├── api.js                 # API client wrapper
│       ├── auth.js                # Token management & session handling
│       └── utils.js               # SLA countdown timer & date formatting utilities
├── uploads/                       # Persisted user media
│   ├── complaints/                # Submission evidence photos
│   └── resolutions/               # Staff resolution proof photos
└── docs/                          # Project specifications
    ├── PRD.md                     # Product Requirements Document
    ├── ARCHITECTURE.md            # System Architecture & Technical Design (This file)
    └── TASKS.md                   # Task breakdown & execution roadmap
```

---

## 8. 🛠️ Technology Stack & Selection Rationale

| Layer | Chosen Technology | Architectural Rationale |
|---|---|---|
| **Backend Runtime** | **Node.js + Express** | High I/O performance, minimal boilerplate, rich middleware ecosystem, single-developer friendly. |
| **Database** | **SQLite (`better-sqlite3`)** | Zero-configuration file-based DB, synchronous low-latency execution, perfect for city-scale MVP; readily portable to PostgreSQL. |
| **Authentication** | **JWT (jsonwebtoken) + bcryptjs** | Stateless, horizontally scalable token verification with robust password hashing (10 salt rounds). |
| **File Storage** | **Multer (Local Disk)** | Native multipart/form-data parsing with disk persistence; cleanly abstractable to S3/Cloud Storage. |
| **Frontend UI** | **Vanilla HTML5 + Modern CSS + JS** | Zero build step friction, immediate browser reloading, lightweight, and blazing-fast rendering. |

---

## 9. 🛡️ Security Boundaries & Invariants

1. **Server-Side Authorization**: Every state-changing endpoint verifies the JWT token, extracts user roles, and verifies departmental ownership. Frontend button visibility is purely cosmetic.
2. **Department Data Isolation**: Department staff accounts are isolated to their specific `department_id`. SQL queries explicitly enforce `WHERE department_id = ?` for all staff queries.
3. **Public Anonymity Safeguard**: All public dashboard endpoints (`/api/public/*`) strip out `citizen_id`, citizen names, email addresses, and phone numbers.
4. **Tamper-Proof SLA Math**: The SLA deadline is locked at `created_at + sla_hours` and cannot be modified by staff. Breach flags are computed live based on time elapsed.

---

## 10. 📈 Scalability & Evolution Roadmap

When Civic-Sense expands beyond the initial MVP:

```
[Phase 1: MVP]               [Phase 2: Vision & Maps]          [Phase 3: Production Scale]
• SQLite Database       -->  • Geospatial GIS Mapping     -->  • PostgreSQL + PostGIS
• Keyword Classifier    -->  • Multimodal Gemini Vision   -->  • Redis / BullMQ Job Queue
• Disk File Storage     -->  • Real-time WebSocket alerts -->  • S3 / Cloud Bucket Storage
```
