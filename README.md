# Grovio — Retail OS for Grocery Stores

Grovio is a complete point-of-sale and retail management system built for small
grocery stores. It provides billing, inventory, purchases, supplier tracking,
customer credit, payments, returns, GST reporting, team management, and
store-level backup/restore — all with per-store data isolation and role-based
access control.

## Architecture

```
Grovio/
├── frontend/          # React 19 SPA (Vite build, Tailwind CSS v4, React Router v7)
│   └── src/
│       ├── lib/api.js          # API client + fetch wrapper (VITE_API_URL)
│       ├── context/AuthContext.jsx   # In-memory access tokens, refresh-cookie flow
│       ├── components/grovio/ProtectedRoute.jsx  # SSR + onboarding gating
│       └── pages/               # Public + authenticated routes
├── backend/           # Node.js 22 / Express 4 API (MongoDB + Mongoose)
│   └── src/
│       ├── config/env.js       # Centralised, validated env config
│       ├── middleware/          # CORS, CSRF, rate-limit, security headers
│       ├── models/              # Mongoose schemas (store-scoped, indexed)
│       ├── routes/              # REST endpoints under /api
│       ├── controllers/         # Request handlers
│       └── services/            # Business logic
├── tests/             # Backend auth + business test suites
└── lovable/           # Read-only reference (do not modify)
```

**Deployment targets:**
- Frontend: static build hosted on **Vercel**
- Backend: Node.js service hosted on **Render**
- Database: **MongoDB Atlas** (single cluster, separate databases per environment)

**Authentication model:**
- Short-lived JWT access tokens kept **in memory** (never persisted to localStorage)
- Rotating opaque refresh tokens stored in an **HttpOnly** cookie
- Double-submit CSRF protection for all state-changing, cookie-authenticated requests
- SameSite=None + Secure cookies in production (cross-origin Vercel → Render)
- Access tokens are never exposed to browser storage; refresh tokens are never logged

## Prerequisites

- **Node.js >= 20** (tested on Node 22.18.0)
- **npm 10+** (each sub-project uses its own `package-lock.json`)
- **MongoDB** (Atlas cluster or local `mongod`) for running backend tests

## Installation

```bash
# Clone the repository, then install per service:
npm ci --prefix frontend
npm ci --prefix backend
```

## Local Development

```bash
# Terminal 1 — backend (listens on PORT from .env, default 3001)
cd backend
npm run dev

# Terminal 2 — frontend (Vite dev server, proxies /api → localhost:3001)
cd frontend
npm run dev
```

The Vite dev server proxies `/api/*` to the backend at `http://localhost:3001`
so cookies work same-origin during development. In production the frontend calls
the backend directly via `VITE_API_URL`.

## Environment Configuration

| Variable | Service | Secret? | Required | Description |
|---|---|---|---|---|
| `MONGODB_URI` | Backend | Yes | Prod | Atlas connection string for the production database |
| `JWT_SECRET` | Backend | Yes | Yes | Signs access tokens; min 32 chars in production |
| `CLIENT_ORIGIN` | Backend | No | Yes | Frontend URL(s), comma-separated, for CORS allowlist |
| `PORT` | Backend | No | No | Listen port (Render sets this automatically) |
| `COOKIE_SECURE` | Backend | No | No | Override cookie Secure flag (auto: true in prod) |
| `COOKIE_SAMESITE` | Backend | No | No | Override SameSite (auto: none in prod, lax in dev) |
| `MONGODB_TEST_URI` | Backend | Yes | Test only | Dedicated test database URI |
| `ACCESS_TOKEN_EXPIRES_IN` | Backend | No | No | Short-lived token lifetime (default `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | Backend | No | No | Refresh token lifetime, default (default `7`) |
| `REFRESH_TOKEN_TTL_DAYS_REMEMBERED` | Backend | No | No | Refresh token lifetime, remember-me (default `30`) |
| `RESET_TOKEN_TTL_MINUTES` | Backend | No | No | Password reset token expiry (default `30`) |
| `EXPOSE_DEV_RESET_TOKEN` | Backend | No | No | Dev-only: return reset token in API response |
| `SMTP_HOST` | Backend | No | No | SMTP server for password-reset emails |
| `SMTP_PORT` | Backend | No | No | SMTP port |
| `SMTP_USER` | Backend | Yes | No | SMTP username |
| `SMTP_PASS` | Backend | Yes | No | SMTP password |
| `EMAIL_FROM` | Backend | No | No | Sender address for reset emails |
| `VITE_API_URL` | Frontend | No | Prod | Backend API URL (e.g. `https://grovio-api.onrender.com`) |

### Environment separation

| Environment | Database | CLIENT_ORIGIN | EXPOSE_DEV_RESET_TOKEN | VITE_API_URL |
|---|---|---|---|---|
| Local dev | `grovio_test` / `grovio_test_business` | `http://localhost:5173` | `true` | `http://localhost:3001` (via proxy) |
| Preview (Render/Git branch) | `grovio_test` / `grovio_test_business` | Branch frontend URL | `false` | Preview backend URL |
| Production | `grovio_prod` | `https://<app>.vercel.app` | `false` | `https://grovio-api.onrender.com` |

> **Never** use `grovio_test`, `grovio_test_business`, or `grovio_dev` as the
> production database name. Production data lives in a separate Atlas database.

## Testing

```bash
# Backend tests (uses test databases grovio_test / grovio_test_business)
cd backend
npm test

# Frontend unit tests (Vitest)
cd frontend
npm run test

# Frontend E2E (Playwright — requires local dev server running)
cd frontend
npm run playwright
```

## Deployment

See [DEPLOYMENT_READINESS.md](./DEPLOYMENT_READINESS.md) for the complete
deployment guide, Render Blueprint config, and post-deployment verification
checklist.

## .env Files

Copy the example files and fill in real values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

The `.env` files are in `.gitignore` and must never be committed.
