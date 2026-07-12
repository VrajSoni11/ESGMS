# EcoSphere — Frontend

React (Vite) + Tailwind CSS frontend for the EcoSphere ESG Management Platform.
Built to talk directly to the existing `backend/` REST API — no other services needed.

## Stack
- React 18 + Vite
- Tailwind CSS (custom "forest" design system, see `tailwind.config.js`)
- React Router v6 (role-gated routes)
- Axios (JWT auto-attached via interceptor)
- Recharts (Environmental dashboard charts)

## Folder structure
```
frontend/
├── src/
│   ├── api/client.js          Axios instance, attaches JWT, handles 401 → logout
│   ├── context/                AuthContext (login/me/logout), ToastContext (toasts)
│   ├── components/             Layout (sidebar/topbar), ProtectedRoute, ScoreRing, ui.jsx (shared primitives)
│   └── pages/                  One page per module: Dashboard, Environmental, Social,
│                                Governance, Gamification, Reports, MasterData, Users,
│                                Settings, Notifications, Login
├── index.html
├── vite.config.js              Dev proxy: /api and /uploads → http://localhost:5000
└── tailwind.config.js
```

## How it maps to the backend

Every page calls the existing Express routes as-is — nothing in `backend/` needs to change.

| Frontend page      | Backend routes used |
|---------------------|---------------------|
| Dashboard            | `GET /api/dashboard`, `GET /api/dashboard/my-dashboard` |
| Environmental         | `/api/environmental/*` (emission-factors, carbon-transactions, goals, dashboard) |
| Social                | `/api/social/*` (csr-activities, participations, trainings, diversity-metrics) |
| Governance             | `/api/governance/*` (policies, acknowledgements, audits, compliance-issues) |
| Gamification            | `/api/gamification/*` (challenges, leaderboard, badges, rewards) |
| Reports                  | `/api/reports/*` (environmental, social, governance, esg-summary, custom) — downloads as CSV/Excel/PDF |
| Master Data                | `/api/masterdata/*` (departments, categories, products) — Admin only |
| Users                        | `/api/users/*` — Admin/Manager only |
| Settings                      | `/api/settings/*` (esg-weights, feature-toggles, notification-channels) — Admin only |
| Notifications                   | `/api/notifications/*` |

Role gating (ADMIN / MANAGER / EMPLOYEE) is enforced both by hiding nav items/buttons in the
UI **and** by the backend's `authorize()` middleware — the UI never assumes the backend, it
just reflects it.

## Setup

### 1. Install
```bash
cd frontend
npm install
```

### 2. Configure the API target (optional)
By default, `vite.config.js` proxies `/api` and `/uploads` to `http://localhost:5000`
(matching your backend's default `PORT` in `backend/.env`). If your backend runs on a
different port, edit the `target` in `frontend/vite.config.js`.

### 3. Run
```bash
npm run dev
```
Opens at `http://localhost:5173`. Make sure the backend (`cd backend && npm run dev`) is
already running on port 5000 with the database migrated/seeded.

### 4. Log in
Users aren't self-service — per the PRD, accounts are created by an Admin (via `POST
/api/users` from the Users page, or directly in the DB). Create your first Admin user
directly in Postgres, e.g.:

```sql
-- bcrypt hash below is for password "admin123" — replace before real use
INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin User', 'admin@ecosphere.io', '<bcrypt-hash>', 'ADMIN');
```
Or run a tiny Node one-off using `bcryptjs` (already a backend dependency):
```bash
cd backend
node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
```
Paste the resulting hash into the SQL above, then log in with `admin@ecosphere.io` /
`admin123` and create the rest of your users from the Users page.

## Build for production
```bash
npm run build
```
Outputs static files to `frontend/dist/`. Serve with any static host, or point Express at
it with `express.static` if you want a single deployable service.

## Notes on business rules reflected in the UI
- **Auto Emission Calculation** — picking an Emission Factor in "Record Transaction" lets the
  backend compute CO2e automatically (toggle respected server-side).
- **Evidence Requirement** — Approve buttons on Participations/Challenges will be rejected by
  the backend (and surfaced as a toast) if proof is required and missing.
- **Badge Auto-Award** — badges appear automatically on the employee dashboard after an
  approval, no manual action needed in the UI.
- **Reward Redemption** — disabled once stock hits 0; backend still re-validates points balance.
- **Compliance Issue Ownership** — Owner + Due Date are required fields in the "Raise Issue" form.
- **Overdue Flagging** — status pill turns red (`FLAGGED_OVERDUE`) once the backend cron job runs.
