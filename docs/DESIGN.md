# Design Specification & Visual System
## Project: Civic-Sense

**Purpose:** The visual language, UI components, typography, color palette, and screen-by-screen UX specifications for Civic-Sense.

---

## 1. 🏛️ Design Principles

1. **Civic Trust & Legitimacy**: Styled with the clarity, authority, and sober aesthetics of official municipal signage (drawing inspiration from USWDS and gov.uk) rather than playful consumer startups.
2. **Data-First Hierarchy**: SLA countdown timers, department status badges, and breach metrics take center stage without visual clutter.
3. **Unambiguous Semantic Color Coding**: Statuses and severity levels use universally distinctive color tokens so any observer can assess urgency at a glance.
4. **Frictionless Citizen Interaction**: Complaint reporting is focused and completed in fewer than 5 taps/clicks.

---

## 2. 🎨 Color Tokens & Palette

A municipal palette grounded in authoritative ink, crisp paper backgrounds, caution amber, resolution forest green, and urgent brick red:

| Token | Hex | Role & Usage |
|---|---|---|
| `--ink` | `#16233F` | Primary brand authority, top navigation bar, headers, primary buttons |
| `--ink-soft` | `#3D5A80` | Secondary links, metadata, `in_progress` status chip |
| `--paper` | `#F6F4EE` | Page background (warm governmental paper tone) |
| `--paper-raised` | `#FFFFFF` | Form panels, dashboard data cards, modal containers |
| `--line` | `#D9D4C6` | Hairline borders, dividers, card outlines |
| `--amber` | `#C98A2B` | `acknowledged` status, `moderate` severity, warnings |
| `--amber-bg` | `#FBF0DC` | Amber chip background |
| `--brick` | `#A8412B` | **SLA breaches**, `severe` severity — urgent attention color |
| `--brick-bg` | `#FAE6E0` | Brick chip background |
| `--forest` | `#2F6846` | `resolved` status, on-track SLA confirmation |
| `--forest-bg` | `#E4EEE6` | Forest chip background |
| `--text` | `#1B1D1F` | High-contrast primary body text |
| `--text-muted` | `#5B5F63` | Subdued metadata, secondary labels, timestamps |

> [!CAUTION]
> **Brick Red Usage Rule:** `--brick` is strictly reserved for **SLA breaches and severe hazards**. Never use it decoratively.

---

## 3. ✍️ Typography & Type Scale

| Role | Font Family | Rationale |
|---|---|---|
| **UI, Headings & Body** | **Public Sans** (Google Fonts) | Authentic civic typeface used by the U.S. Federal Government (USWDS); readable, modern, authoritative. |
| **Data, Timers & IDs** | **IBM Plex Mono** (Google Fonts) | Monospace precision for SLA countdown timers, ticket IDs, percentages, and lat/long coordinates. |

### Type Scale Hierarchy
- **Page Header**: `1.75rem` – `2.1rem`, weight 800, tight letter-spacing (`-0.02em`)
- **Section Heading**: `1.15rem` – `1.35rem`, weight 700
- **Body Text**: `0.9rem` – `0.95rem`, weight 400, line-height `1.5`
- **Metadata / Labels**: `0.75rem` – `0.85rem`, weight 500, uppercase or sentence case
- **Mono Data & Timers**: `0.82rem` – `0.9rem`, weight 600, IBM Plex Mono

---

## 4. 📐 Layout Architecture

Left-aligned, clean structure with maximum readable container widths (~1080px for dashboards, ~520px–680px for reporting forms and auth).

```
┌────────────────────────────────────────────────────────────────────────┐
│  TOP BAR (Navy #16233F with 2px Amber Accent Border)                   │
│  🏛️ Civic-Sense  |  📊 Public Dashboard  |  📝 Report Issue  |  👤 Login │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Page Title & One-Line Civic Context                                  │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 📋 Main Content Panel (White Card, Hairline Border #D9D4C6)   │   │
│   │                                                                │   │
│   │   • Reporting Form with Live Geolocation                       │   │
│   │   • Department Queue with Single Action Steppers               │   │
│   │   • Public Accountability Metrics & Dynamic SLA Countdown Feed │   │
│   │                                                                │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  Footer: City Municipal Digital Service • Open Accountability Ledger   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 🧩 UI Component Specifications

### 5.1 Status Chips
Pill-shaped badges with high-contrast text:
- `submitted`: Neutral grey (`#E5E7EB` bg / `#374151` text)
- `acknowledged`: Amber (`#FBF0DC` bg / `#C98A2B` text)
- `in_progress`: Soft Ink (`#E0E7FF` bg / `#3D5A80` text)
- `resolved`: Forest (`#E4EEE6` bg / `#2F6846` text)

### 5.2 Severity Badges
- `minor`: Low-key grey chip
- `moderate`: Warning amber chip
- `severe`: Urgent brick red chip

### 5.3 SLA Countdown Timer Component
Rendered in `IBM Plex Mono`:
- **On Track**: Forest green (`● 2d 14h left`)
- **Imminent Warning (< 4h)**: Amber (`▲ 3h 12m left`)
- **Breached**: Bold brick red with warning badge (`✖ 1d 4h overdue`)
- **Resolved**: Muted text (`Resolved in 18h`)

### 5.4 Reusable Complaint Card
Shared across Citizen Tracker, Staff Queue, and Public Watchdog Feed:
```
┌───────────────────────────────────────────────────────────────────────┐
│ [📷 Photo]  Pothole on 5th Ave & Pine St        [Status: In Progress] │
│             Roads & Infrastructure • Minor       [⏱️ SLA: 1d 6h left]  │
│             Submitted 4 hours ago • Landmark: Near City Park Gate     │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 6. 📱 Screen-by-Screen UX Specifications

### 6.1 Landing Page (`index.html`)
- **Hero**: Clear statement of civic purpose ("Transparent civic issue routing and verifiable municipal accountability").
- **Action CTAs**: Primary button "Report an Issue" (Ink navy) + Secondary button "View Public SLA Dashboard" (Outline).
- **Process Steps**: 4-stage visual flow (Report $\rightarrow$ AI Auto-Classification $\rightarrow$ SLA Timer Starts $\rightarrow$ Resolution with Proof).

### 6.2 Authentication Portal (`login.html`)
- Clean tabbed interface: **Citizen Login** / **Citizen Registration**.
- Single utility-first panel without superfluous promotional distractions.

### 6.3 Citizen Reporting Flow (`report.html`)
- Camera photo upload + image preview.
- Text description input with real-time character count.
- GPS auto-capture badge with geolocation status indicator.
- **Immediate Feedback Card**: On submission, reveals AI classification result (category, severity, confidence %, assigned department, and fixed SLA deadline).

### 6.4 Department Staff Dashboard (`department.html`)
- Filter bar: `All` | `Submitted` | `Acknowledged` | `In Progress` | `Resolved`.
- Task list filtered exclusively to staff member's department.
- **Single-Action Trigger**: Each row features only the *next valid step* (e.g. Acknowledge $\rightarrow$ Start Work $\rightarrow$ Mark Resolved).
- Resolution modal supporting optional "Proof of Resolution" photo upload.

### 6.5 Public Accountability Dashboard (`public-dashboard.html`)
- **Zero-Login Public Access**.
- **City-Wide Metric Cards**: Total Complaints, Open Issues, Resolved Issues, Active Breaches.
- **Department Performance Table**: SLA Compliance %, Average Resolution Time, Total Breaches, Resolved Late Count.
- **Searchable Complaint Feed**: Filterable by department, category, and SLA status.

---

## 7. ♿ Accessibility & Edge States

- **Empty States**: Clear, muted messaging (e.g., "No active complaints in your department queue").
- **Contrast Ratios**: All text and chip combinations comply with WCAG 2.1 AA contrast requirements.
- **Focus & Keyboard Navigation**: Distinct focus outlines on all interactive inputs and buttons.
