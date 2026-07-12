# EcoSphere — ESG Management Platform
### Full Installation Guide (Backend + Database + Frontend)

This covers your **existing** backend/database setup plus the **new** frontend that was just
added. Drop the `frontend/` folder into your project root (next to `backend/` and `database/`)
so the tree looks like:

```
esgms/
├── backend/
├── database/
├── frontend/              ← new
├── EcoSphere_PRD.docx
└── EcoSphere ESG Management Platform.pdf
```

---

## 0. Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ running locally (or a connection string to a hosted instance)
- pgAdmin (or `psql`) to run the schema/seed SQL

---

## 1. Database

```bash
# In pgAdmin's Query Tool, or via psql:
psql -U postgres -f database/01_schema.sql
psql -U postgres -f database/02_seed_reference_data.sql
```
This creates all tables/enums and seeds categories, emission factors, badges, rewards,
policies, and starter departments. **Users are not seeded** — you create your first Admin
in step 2.

---

## 2. Backend

```bash
cd backend
npm install
```

Confirm `backend/.env` has at least:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ecosphere"
JWT_SECRET="some-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=5000
CLIENT_URL="http://localhost:5173"
```

Generate the Prisma client (schema already matches `database/01_schema.sql`):
```bash
npx prisma generate
```

Create your first Admin user (accounts are created directly, per the PRD — no public
sign-up flow):
```bash
node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
```
Copy the printed hash into:
```sql
INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin User', 'admin@ecosphere.io', '<paste-hash-here>', 'ADMIN');
```

Start the backend:
```bash
npm run dev
```
You should see `✅ EcoSphere API running on http://localhost:5000`. Visit
`http://localhost:5000/api/health` to confirm.

---

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```
Opens at `http://localhost:5173`. In dev mode, Vite proxies `/api` and `/uploads`
requests straight to `http://localhost:5000` (see `frontend/vite.config.js`) — so there's
no CORS setup needed and no `.env` required for local development.

Log in with `admin@ecosphere.io` / `admin123`, then use the **Users** page to create
Manager and Employee accounts, and **Master Data** to add departments/categories, before
running through the demo flow.

---

## 4. Suggested demo run-through (matches PRD Section 9 success criteria)

1. Log in as **Admin** → see the org-wide dashboard with the ESG score ring.
2. **Master Data** → add a department if needed. **Users** → create an Employee in that
   department.
3. **Environmental** → add an Emission Factor, then record a Carbon Transaction against
   it (auto-calculates CO2e) → dashboard score updates.
4. **Gamification** → create and Activate a Challenge.
5. Log in as the **Employee** → join the Challenge, submit progress/proof from their
   dashboard.
6. Back as **Admin/Manager** → **Gamification → Challenges**, approve the submission →
   XP awarded, badge auto-unlocks if threshold met, Leaderboard updates.
7. **Governance** → raise a Compliance Issue with a past Due Date → after the hourly cron
   runs (or trigger manually, see below), it flags as `FLAGGED_OVERDUE` and a notification
   appears.
8. **Reports** → download the ESG Summary Report as CSV.
9. **Settings** → adjust ESG pillar weightings → **Dashboard** overall score recalculates.

To force the overdue-flagging cron immediately instead of waiting an hour, restart the
backend (`flagOverdueIssues()` also runs once on server start), or call
`POST /api/scoring/recalculate-all` as Admin to refresh scores on demand.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend shows "Network Error" on login | Backend isn't running on port 5000, or `vite.config.js` proxy target doesn't match your `PORT` |
| 401 immediately after login | `JWT_SECRET` mismatch or clock skew — check `.env` |
| Emission factor dropdown empty | Re-run `database/02_seed_reference_data.sql` |
| Approve button says "evidence required" | Employee needs to attach a proof file when joining/submitting, or turn off **Evidence Requirement** in Settings |
| CSV/Excel/PDF download does nothing | Check the browser console — confirm you're logged in as ADMIN/MANAGER (Reports routes are role-gated) |
