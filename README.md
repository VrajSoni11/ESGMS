# EcoSphere — ESG Management Platform
 
EcoSphere is a full-stack web platform that helps organizations track, score, and act on
their **Environmental, Social, and Governance (ESG)** performance in one place — instead of
spreadsheets scattered across sustainability, HR, and compliance teams.
 
It gives every organization a single, live **ESG Score**, rolled up from real activity across
three pillars, and turns day-to-day ESG work (logging emissions, running CSR drives,
tracking policy sign-off, closing compliance issues) into something employees actually want
to do, using gamification — XP, badges, leaderboards, and redeemable rewards.
 
---
 
## What problem does it solve?
 
Most companies manage ESG as three disconnected efforts:
 
- **Environmental** teams track emissions in one spreadsheet
- **HR/People** teams track CSR participation and diversity metrics in another
- **Compliance** teams track policies and audit issues in a third
There's no single source of truth, no live score, and no reason for employees to engage.
EcoSphere fixes this by giving every pillar a proper data model, a shared scoring engine,
and one dashboard — while making participation genuinely engaging for employees instead of
just another compliance chore.
 
---
 
## Who is it for?
 
| Role | What they get |
|---|---|
| **Admin** | Full control — configure emission factors, ESG weightings, feature toggles, manage users/departments, publish policies, schedule audits |
| **Manager** | Reviews and approves CSR/challenge submissions, raises compliance issues, views team-level data and reports |
| **Employee** | A personal dashboard — join CSR activities & challenges, submit proof, earn XP/points/badges, redeem rewards, acknowledge policies |
 
Accounts aren't self-service — they're provisioned by an Admin, matching how most
organizations actually onboard employees into internal tools.
 
---
 
## Core capabilities
 
### Environmental
Emission factor catalog, carbon transaction logging (with **automatic CO2e calculation**
from quantity × emission factor), department-level sustainability goals, and a visual
breakdown of emissions by source and department.
 
### Social
CSR activity management, employee participation with **proof-of-evidence upload**,
approve/reject workflows, training completion tracking, and diversity metrics.
 
### Governance
ESG policy publishing with automatic acknowledgement tracking, scheduled audits,
compliance issue management with mandatory **owner + due date**, and automatic
**overdue flagging** via a background cron job.
 
### Gamification
Challenges with XP rewards and difficulty tiers, an org-wide leaderboard (by employee or
department), an auto-awarding badge system (XP thresholds or challenge counts), and a
points-based reward redemption catalog.
 
### ESG Scoring Engine
Each department gets an Environmental, Social, and Governance score (0–100), computed from
real transactional data — not manual entry. These roll up into department totals and a
single **weighted Overall ESG Score**, with weights configurable by an Admin (must sum to
100%).
 
### Reports
Pre-built Environmental / Social / Governance / ESG Summary reports, plus a custom report
builder with module, department, and date-range filters — all exportable as **CSV, Excel,
or PDF**.
 
### Notifications
In-app alerts for approval decisions, badge unlocks, policy reminders, and overdue
compliance issues, with configurable notification channels.
 
---
 
## Business rules baked into the product
 
- **Auto Emission Calculation** — selecting an emission factor computes CO2e automatically
- **Evidence Requirement** — approvals are blocked server-side if proof is missing and the
  toggle requires it
- **Badge Auto-Award** — badges unlock automatically the moment an employee qualifies
- **Reward Redemption** — blocked once stock hits zero or the employee lacks the points
- **Compliance Issue Ownership** — every issue must have an Owner and a Due Date
- **Overdue Flagging** — an hourly cron job flags open issues past their due date and
  notifies the owner and all Admins
---
 
## Tech stack
 
### Frontend
- **React 18** with **Vite** for a fast dev/build pipeline
- **React Router v6** — role-gated routing (Admin / Manager / Employee)
- **Tailwind CSS** — custom design system (glassmorphism, graphite + sky-mint palette)
- **Recharts** — emissions and department analytics charts
- **Axios** — API client with JWT auto-attach and automatic 401 → logout handling
### Backend
- **Node.js** with **Express**
- **Prisma ORM** over **PostgreSQL**
- **JWT** authentication with role-based authorization middleware
- **Multer** for proof-of-evidence file uploads
- **node-cron** for scheduled jobs (overdue compliance flagging)
- **json2csv**, **ExcelJS**, **PDFKit** for multi-format report generation
- **bcryptjs** for password hashing
### Architecture
A conventional two-tier SPA + REST API:
 
```
frontend/   React SPA — one page per ESG module, calling the API directly
backend/    Express REST API — routes, middleware, Prisma models, scoring engine, cron jobs
database/   PostgreSQL schema, managed via Prisma
```
