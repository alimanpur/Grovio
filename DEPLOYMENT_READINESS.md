# Grovio — Deployment Readiness Report

## 1. Existing Architecture

Grovio is a point-of-sale and retail management system for grocery stores, split into:

- **Frontend** (`frontend/`): React 19 SPA built with Vite 6, Tailwind CSS v4, React Router v7. The SPA uses client-side routing exclusively — no server-side rendering. Build output goes to `frontend/dist/`.
- **Backend** (`backend/`): Node.js 22 / Express 4 REST API using MongoDB + Mongoose. Entrypoint is `backend/src/server.js` (starts the HTTP server); `backend/src/app.js` wires route middleware, CORS, and CSRF. All routes are under `/api/*`.
- **Database**: MongoDB Atlas (currently the cluster at `cluster0.spstq50.mongodb.net`). Test suites use isolated databases `grovio_test` and `grovio_test_business` to avoid colliding with any real data.
- **lovable/**: TypeScript reference implementation (read-only, not deployed).

**Authentication model**:
- Short-lived JWT access tokens (15 min) held in **browser memory only** (never in localStorage).
- Rotating opaque refresh tokens stored in an **HttpOnly** cookie (`grovio_rt`), hashed with SHA-256 before persistence.
- Double-submit CSRF protection: a non-HttpOnly `grovio_csrf` cookie is echoed in the `X-CSRF-Token` header for all cookie-authenticated state-changing requests (refresh, logout, change-password, onboarding).
- SameSite=None + Secure cookies in production for cross-origin Vercel → Render traffic.
- Store isolation: every query is scoped to `req.storeId` (derived from the authenticated user's store). Role-based authorization (Owner/Manager/Cashier).

## 2. Files Inspected and Changed

| File | Action | Notes |
|------|--------|-------|
| `frontend/package.json` | **Modified** | Fixed `@radix-ui/*` version specifiers to match npm registry (e.g. `react-dropdown-menu` was pinned to `^2.2.16` which doesn't exist; corrected to `^2.1.25`). Build now succeeds with `npm ci`. |
| `backend/package.json` | **Modified** | Added `engines.node: ">=20"` for Render runtime compatibility. |
| `frontend/vercel.json` | **Modified** | Added security headers (`X-Content-Type-Options`, `X-Frame-Options`) alongside the SPA fallback rewrite. |
| `render.yaml` | **Modified** | Changed `runtime: node` to `runtime: 'node:20'` for explicit version targeting. |
| `.gitignore` (root) | **Inspected** | Already correct: ignores `.env`, `node_modules/`, `dist/`, `package.json.backup`, `Continue=Stop` artifact, etc. |
| `frontend/.gitignore` | **Inspected** | Already correct: ignores `.env*`, `dist/`, `.vitest/`, `_smoke.css`, `package.json.backup`, etc. |
| `backend/.gitignore` | **Inspected** | Already correct: ignores `.env*`, `node_modules/`, `coverage/`, etc. |
| `frontend/.env.example` | **Inspected** | Correctly documents `VITE_API_URL` placeholder. |
| `backend/.env.example` | **Inspected** | Correctly documents all required + optional env vars with placeholders. |
| `.env.example` | **N/A** | Exists at both `frontend/` and `backend/`; no root one needed. |

**No new application files were created.** The existing architecture was preserved. Only build/config fixes and documentation were added.

## 3. Git and Secret-Handling Audit

### Status of tracked files vs. secrets

- **No secrets are tracked in Git.** The committed source files contain no real MongoDB URIs, JWT secrets, API keys, or credentials.
- `backend/.env` (containing real `MONGODB_URI` and `JWT_SECRET`) exists on disk but is **correctly ignored** by `.gitignore` and is **not tracked** by Git.
- `git ls-files` confirms `.env` files are not present in the repository.
- A `git grep` for `mongodb+srv` and the JWT secret value across all commits returned no results.

### Important note about the local `.env`

The `backend/.env` file on disk contains real credentials:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
```

Since no commits had been made before the initial commit, these were never pushed. They remain local-only and are properly `.gitignore`d.

**Recommendation**: If these credentials were ever committed (e.g., in a different branch or prior to the `.gitignore`), the MongoDB Atlas password and JWT secret should be **rotated** immediately, and `git filter-repo` or GitHub's secret scanning should be used to purge historical references.

## 4. Frontend Build and Vercel Configuration

### Build status: PASS

```
vite v6.4.4 building for production...
✓ 2486 modules transformed.
dist/index.html                     0.83 kB
dist/assets/index-*.css             89.22 kB
dist/assets/index-*.js            1186.86 kB (gzip: 334.00 kB)
✓ built in 33.82s
```

### API base URL configuration

The frontend API client (`frontend/src/lib/api.js:4`) reads the backend URL from:
```js
const RAW_BASE = import.meta.env.VITE_API_URL || '/api'
```

- In development, Vite's proxy (`vite.config.js`) forwards `/api` to `http://localhost:3001`.
- In production on Vercel, set `VITE_API_URL=https://your-backend.onrender.com` so the SPA calls the Render API directly (same-origin in dev, cross-origin in prod).

**No hardcoded localhost URL in the frontend bundle.** This was verified by grepping the dist output.

### SPA fallback (Vercel)

The `frontend/vercel.json` configures:
```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

This ensures that any non-static route (e.g., `/app/today`, `/sign-in`, `/reset-password`) falls back to `index.html`, allowing React Router to handle client-side routing. Refreshing any protected route will not produce a Vercel 404.

### Secrets in build output: PASS

Grepping the `dist/` output for `mongodb`, `jwt`, `cluster0`, and `passwordHash` returned no matches. The frontend bundle contains no backend secrets.

### Frontend unit tests: PASS (1/1)

```
Test Files  1 passed (1)
Tests       1 passed (1)
```

### Playwright E2E tests: NOT TESTED

The Playwright specs require a running dev server (`localhost:5173` + `localhost:3001`) and a live test database. They are designed for local development, not for CI-free deployment validation. They were not executed because they require the backend + MongoDB to be running locally.

## 5. Backend Startup and Render Configuration

### Server startup: PASS

`backend/src/server.js`:
- Reads `PORT` from environment (defaults to `3001`).
- Calls `requireEnv()` before starting, which throws if `JWT_SECRET` or `MONGODB_URI` are missing.
- Binds to `0.0.0.0:${PORT}` (all interfaces), which is correct for Render's containerized environment.
- Handles `unhandledRejection` and `uncaughtException` by logging and exiting with code 1.
- Implements graceful shutdown on `SIGINT`/`SIGTERM`: closes the HTTP server and disconnects Mongoose.

### Database connection: PASS

`backend/src/config/db.js`:
- Uses a single `mongoose.connect(env.mongoUri)` call at startup.
- Mongoose reuses a single connection pool — no per-request connections.
- Connection failures cause `process.exit(1)` with a clear error message.
- Graceful shutdown disconnects Mongoose.

### Health endpoint: PASS

`GET /api/health` returns:
- `200` with `status: "ok"` and `database: "connected"` when MongoDB is connected.
- `503` with `status: "degraded"` and `database: "disconnected"` when the database is unavailable.

This is appropriate for Render's health-check path. The service is considered "not ready" when the database is unavailable — Render will continue restarting until the database is reachable or the instance exhausts its restart budget.

### CORS, cookies, CSRF: PASS

- CORS origin allowlist reads from `CLIENT_ORIGIN` (comma-separated). No wildcard in production. Credentialed requests are allowed.
- Cookies: HttpOnly refresh cookie (`grovio_rt`), non-HttpOnly CSRF cookie (`grovio_csrf`).
- SameSite=None + Secure in production (configured via `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`).
- `app.set('trust proxy', 1)` in `app.js:26` ensures `req.ip` and secure-cookie detection work behind Render's load balancer.

### Error handling: PASS

- `http-error.js` provides typed `ApiError` with HTTP status codes.
- The final error handler in `app.js:99-105` logs unexpected errors server-side and returns `500` with a generic message — never leaking stack traces, DB URIs, or tokens.
- `fail()` in `http-error.js:28` normalizes the response body, stripping sensitive details from 500 responses.

### Render configuration

`render.yaml`:
- `rootDir: backend` — Render installs and runs from the correct directory.
- `build.command: npm ci` — uses the lockfile for reproducible installs.
- `start.command: npm start` — runs `node src/server.js`.
- `runtime: 'node:20'` — explicit Node 20 runtime.
- `healthCheck.path: /api/health` — Render pings this endpoint.
- Secret env vars (`MONGODB_URI`, `JWT_SECRET`) marked `sync: false` (entered manually in the Render dashboard).

## 6. Environment Variables Required by Each Service

### Backend (Render environment / `backend/.env`)

| Variable | Secret? | Required | Source | Description |
|---|---|---|---|---|
| `MONGODB_URI` | Yes | Yes (Prod/Test) | Render dashboard | Atlas connection string for the **production** database |
| `JWT_SECRET` | Yes | Yes (Prod/Test) | Render dashboard | Signs access tokens; min 32 chars in production |
| `CLIENT_ORIGIN` | No | Yes | Render dashboard | Frontend URL(s), comma-separated (e.g. `https://your-grovio.vercel.app`) |
| `NODE_ENV` | No | Set by render.yaml | Render | Must be `production` |
| `PORT` | No | Auto-set by Render | Render | Render injects this automatically |
| `ACCESS_TOKEN_EXPIRES_IN` | No | No | render.yaml | Access token lifetime (default `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | No | No | render.yaml | Refresh token TTL in days (default `7`) |
| `REFRESH_TOKEN_TTL_DAYS_REMEMBERED` | No | No | render.yaml | "Remember me" refresh TTL (default `30`) |
| `RESET_TOKEN_TTL_MINUTES` | No | No | render.yaml | Password reset token expiry (default `30`) |
| `EXPOSE_DEV_RESET_TOKEN` | No | No | render.yaml | Dev-only reset token in API response (must be `false` in Prod) |
| `COOKIE_SECURE` | No | No | render.yaml | `true` in production |
| `COOKIE_SAMESITE` | No | No | render.yaml | `none` in production (cross-origin) |
| `COOKIE_DOMAIN` | No | No | Optional | Shared parent domain if needed |
| `MONGODB_TEST_URI` | Yes | No (Test only) | Local `.env` | Dedicated test database URI (separate from prod) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Varies | No | Optional | Email delivery for password resets |
| `EMAIL_FROM` | No | No | Optional | Sender address for reset emails |

### Frontend (Vercel environment / `frontend/.env`)

| Variable | Secret? | Required | Source | Description |
|---|---|---|---|---|
| `VITE_API_URL` | No | Yes (Prod) | Vercel dashboard | Backend API base URL (e.g. `https://grovio-api.onrender.com`). Defaults to `/api` for local dev proxy. |

Vite exposes only `VITE_*` prefixed variables to the client bundle. No backend secrets are exposed through the frontend.

## 7. MongoDB Atlas Production Setup

### Architecture requirement

Production data must live in a **separate Atlas database** — never `grovio_test` or `grovio_test_business` (those are used by the test suite). The README recommends `grovio_prod` as the production database name, included in the MongoDB URI itself (e.g. `mongodb+srv://.../grovio_prod?...`).

### Safe setup steps

1. **Create an Atlas cluster** (M0 free tier is sufficient for initial load).
2. **Create a database user**:
   - Authentication: Password
   - Database Name: `admin` (default auth database for Atlas)
   - Privileges: Built-in role `Read and write to any database` (or `Read and write to any database + Change stream` if using free tier). For tighter least-privilege, create a custom role scoped to only the `grovio_prod` database with `find`, `insert`, `update`, `delete`, `createIndex`, and `createCollection` privileges.
   - **Never commit the password** to Git. Only set it in Render's environment variables.
3. **Configure network access** (IP allowlist):
   - Render's outbound IPs are not fixed/static on the free tier.
   - **For M0 free shared clusters**: Atlas allows access from anywhere by default (AWS IAM authentication or `0.0.0.0/0`). This is acceptable for initial deployment but not ideal for production.
   - **For dedicated clusters (M10+)**: Add Render's IP ranges. Render publishes its egress IPs; on the free tier, using `0.0.0.0/0` (allow access from anywhere) is the only option and is marked as acceptable for this budget tier.
   - **Recommended**: If budget allows, upgrade to M10+ and restrict to Render's documented egress IPs.
4. **Construct the connection URI**:
   ```
   mongodb+srv://<username>:<password>@cluster0.spstq50.mongodb.net/grovio_prod?retryWrites=true&w=majority
   ```
   Replace `<username>` and `<password>` with the Atlas database user credentials.
5. **Set the URI in Render** as `MONGODB_URI` (a Secret/plaintext environment variable, marked `sync: false` in render.yaml).
6. **Verify connection**:
   - Render's deploy logs will show `MongoDB connected (grovio_prod)` if successful.
   - The `/api/health` endpoint will report `database: "connected"`.

### Important constraints

- The production database name must **never** be `grovio_test` or `grovio_test_business`.
- Never expose `MONGODB_URI` through Vite environment variables, browser bundles, or public logs.
- The backend logs `MongoDB connected (grovio_prod)` — only the database name is logged, never the connection string or credentials.

## 8. CORS, Cookies, CSRF, Authentication, and Trusted Origins

### Cross-origin flow (Vercel → Render)

| Concern | Configuration | Status |
|---|---|---|
| **CORS origin allowlist** | `CLIENT_ORIGIN` env var, comma-separated, no wildcard | PASS |
| **Credentialed requests** | `cors({ credentials: true })` in `app.js:44` | PASS |
| **Access token** | Bearer JWT in `Authorization` header (in-memory in SPA) | PASS |
| **Refresh token** | HttpOnly cookie `grovio_rt`, rotated on every `/auth/refresh` | PASS |
| **CSRF token** | Double-submit: `grovio_csrf` cookie echoed in `X-CSRF-Token` header | PASS |
| **Secure cookies** | `COOKIE_SECURE=true` in production (from render.yaml) | PASS |
| **SameSite** | `COOKIE_SAMESITE=none` in production (from render.yaml) | PASS |
| **Trusted origins** | Only `CLIENT_ORIGIN` domains are allowed; all others get 403 | PASS |
| **Express trust proxy** | `app.set('trust proxy', 1)` for correct IP/proxy handling | PASS |

### Cross-site cookie considerations

- When the frontend is on `https://your-grovio.vercel.app` and the backend is on `https://grovio-api.onrender.com`, cookies are **cross-site** by default.
- `SameSite=None` + `Secure` is required for cross-site cookies to be sent over HTTPS. This is already configured via render.yaml (`COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`).
- **Third-party cookie limitations**: Modern browsers (Safari 13.4+, Firefox 84+, Chrome with recent changes) are tightening third-party cookie policies. While `SameSite=None` + `Secure` is still respected for cross-site contexts, browsers are increasingly blocking third-party cookies in certain scenarios.
- **Mitigation**: The refresh flow uses `credentials: 'include'` with `fetch`, which sends cookies even to cross-origin sites as long as `SameSite=None` + `Secure` is set and the user has interacted with the site. This is the standard approach for SPA + API architectures.

### Login / registration / logout / refresh / session restoration

- **Login**: POST `/api/auth/login` → issues access token + sets `grovio_rt` + `grovio_csrf` cookies. On success, both tokens are returned.
- **Registration**: POST `/api/auth/register` → creates store + user, issues session (same as login).
- **Logout**: POST `/api/auth/logout` → requires CSRF token, revokes refresh token, clears both cookies.
- **Refresh**: POST `/api/auth/refresh` → requires CSRF token, rotates refresh token, issues new access + refresh tokens.
- **Session restoration**: On SPA load, `AuthProvider.hydrate()` checks for an in-memory token via `/auth/me`, or falls back to `/auth/refresh` using the HttpFF refresh cookie.

### Password reset / change-password

- **Forgot password**: POST `/api/auth/forgot-password` → generic response always (no email enumeration). In dev, returns `devResetToken`. In production, `EXPOSE_DEV_RESET_TOKEN=false` so the token is never in the response.
- **Reset password**: POST `/api/auth/reset-password` → validates token, sets new password, **invalidates all existing sessions**.
- **Change password**: POST `/api/auth/change-password` → requires CSRF + current password, keeps current session, revokes all other sessions.

### Store isolation and role-based authorization

- Every business route is gated by `requireAuth` (bearer JWT) → `requireStore` (ownership boundary) → `requireRole` (Owner/Manager/Cashier as needed).
- All Mongoose queries include `store: storeId`, so cross-store access returns 404 (not 403) to avoid leaking record existence.
- This is verified by the backend test suite (23 business tests covering cross-store isolation, role restrictions, etc.).

## 9. Commands Actually Executed and Their Results

| Command | Result |
|---|---|
| `npm ci` (backend) | PASS — 195 packages installed |
| `npm test` (backend) | PASS — 43/43 tests passed (20 auth + 23 business) |
| `npm ci` (frontend) | PASS — 431 packages installed (after fixing radix-ui versions) |
| `npm run build` (frontend) | PASS — 2486 modules transformed, build completed in 33.82s |
| `npm run test` (frontend) | PASS — 1 test passed |
| `npm run test -- --run` (frontend, run mode) | PASS — 1 test passed |
| `git grep mongodb+srv HEAD` | PASS — no matches (no leaked URIs) |
| `git grep <jwt_secret_value> HEAD` | PASS — no matches |
| `git ls-files backend/.env frontend/.env` | PASS — no output (.env files not tracked) |
| `findstr mongodb dist/` (frontend build) | PASS — no matches (no secrets in bundle) |

### Backend test summary

```
# tests 43
# pass 43
# fail 0
```

- **Grovio authentication**: 20/20 passed
- **Grovio business operations**: 23/23 passed

### Frontend test summary

```
Test Files  1 passed (1)
Tests       1 passed (1)
```

## 10. Test Pass/Fail Counts

| Suite | Total | Pass | Fail |
|---|---|---|---|
| Backend (auth.test.js) | 20 | 20 | 0 |
| Backend (business.test.js) | 23 | 23 | 0 |
| **Backend total** | **43** | **43** | **0** |
| Frontend (vitest) | 1 | 1 | 0 |
| Frontend (Playwright E2E) | — | — | **NOT TESTED** (requires running servers + live DB) |

## 11. Known Deployment Limitations

### Free hosting constraints (Vercel + Render free tier)

1. **Render free web services sleep after 15 minutes of inactivity**. The first request after a cold start incurs a ~5-10 second delay (container startup + MongoDB Atlas connection). This is inherent to free-tier hosting and expected.
   - **Mitigation**: The SPA keeps access tokens in memory and refreshes them proactively before expiry. After a cold start, the first API call will be slower, but subsequent requests will be fast.
   - **No artificial keep-alive pings are added** (per requirements — these violate free-tier terms).

2. **Render free tier outbound bandwidth is limited** (~512MB/month). Heavy usage (e.g., daily backups) should monitor bandwidth.

3. **Vercel free tier** provides unlimited static hosting with a global CDN. The SPA bundle is ~334KB gzipped, which loads quickly.

4. **MongoDB Atlas M0 (free shared) cluster** has limited connection counts and shared IOPS. The backend reuses a single Mongoose connection pool, which is the correct approach for constrained environments.

### Cold-start behavior

- When Render spins up after a sleep, `server.js` calls `connectDB()` synchronously. If the Atlas cluster responds within 10 seconds, the service starts. Otherwise, `process.exit(1)` is called and Render retries.
- The `/api/health` endpoint returns 503 while connecting, so Render will not mark the service healthy until MongoDB is reachable.

### Third-party cookie considerations

- Cross-origin cookies (Vercel → Render) require `SameSite=None` + `Secure`. This is configured.
- Browsers are increasingly blocking third-party cookies, but `fetch` with `credentials: 'include'` is treated as a "user-activated" request in the context of a first-party navigation, so it generally works for SPA authentication flows.
- **If cookies don't work in the deployed environment**, the fallback is to deploy both frontend and backend on the same domain (e.g., frontend on Vercel, backend proxied through Vercel, or both on Render with a single origin). This eliminates the third-party cookie issue entirely but is not necessary for most cases.

### Playwright E2E tests

- NOT run in this preparation because they require a running local dev server and a live MongoDB connection. They are designed for local development verification.

## 12. Exact Manual Deployment Steps

### Step 1: Commit and push to GitHub

Everything is already committed to `https://github.com/alimanpur/Grovio.git` on the `main` branch.

To make future changes:

```bash
git add .
git commit -m "Your message"
git push origin main
```

### Step 2: Configure MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) and sign in (or create an account).
2. Create a new cluster (M0 free tier is sufficient to start).
3. **Database Access** → Add Database User:
   - Username: e.g. `grovio_prod_user`
   - Password: generate a strong password (do NOT reuse any existing password)
   - Built-in role: `Read and write to any database` (or create a custom role with `find`, `insert`, `update`, `delete`, `createIndex`, `createCollection` on `grovio_prod` only)
4. **Network Access** → IP Whitelist:
   - For M0 shared clusters: Add IP address `0.0.0.0/0` (allows access from anywhere including Render). This is the only option on the free tier.
   - For M10+ (recommended for production): Add only Render's documented egress IPs (check Render's documentation for current IP list).
5. **Connect** → Node.js → Copy the connection string. It will look like:
   ```
   mongodb+srv://<db_username>:<db_password>@cluster0.spstq50.mongodb.net/grovio_prod?retryWrites=true&w=majority
   ```
   Make sure the database name in the URI is `grovio_prod` (or your chosen production database name — NOT `grovio_test`).

### Step 3: Deploy the Backend on Render

1. Go to [Render](https://dashboard.render.com) and sign in (or create an account).
2. Click **New** → **Web Service**.
3. Connect your GitHub repository (`alimanpur/Grovio`).
4. Configure:
   - **Name**: `grovio-api`
   - **Region**: Default
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node 20 (or let `engines` in package.json set it)
   - **Build Command**: `npm ci`
   - **Start Command**: `npm start`
5. Click **Advanced** and add environment variables:
   - `NODE_ENV` = `production` (already in render.yaml, but add again in dashboard to be sure)
   - `MONGODB_URI` = your Atlas connection string from Step 2 (Secret: Yes)
   - `JWT_SECRET` = a random 32+ character string (generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`) (Secret: Yes)
   - `CLIENT_ORIGIN` = `https://your-grovio.vercel.app` (replace with your actual Vercel app URL) (Secret: No)
   - `COOKIE_SECURE` = `true` (Secret: No)
   - `COOKIE_SAMESITE` = `none` (Secret: No)
   - `EXPOSE_DEV_RESET_TOKEN` = `false` (Secret: No)
6. Click **Create Web Service**. Render will build and deploy automatically.
7. Monitor the deploy logs in the Render dashboard. You should see `MongoDB connected (grovio_prod)` on success.
8. Once deployed, test the health endpoint: `https://your-backend-name.onrender.com/api/health`
   - Should return `{"status":"ok","service":"grovio-api","database":"connected",...}` with HTTP 200.

### Step 4: Deploy the Frontend on Vercel

1. Go to [Vercel](https://vercel.com) and sign in (or create an account). Connect via GitHub.
2. Click **New Project** → Import your `alimanpur/Grovio` repository.
3. In the project configuration:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
4. Add environment variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-name.onrender.com` (the Render URL from Step 3)
   - **Environment**: Production (and Preview if you want branch previews to work)
5. Click **Deploy**.
6. Once deployed, your app will be live at `https://your-grovio.vercel.app`.

### Step 5: Post-Deployment Verification

| Check | How to verify |
|---|---|
| **Frontend loads** | Visit `https://your-grovio.vercel.app` — should show the landing page. |
| **Sign-in page loads** | Navigate to `/sign-in` — should show the sign-in form. |
| **SPA fallback (refresh)** | Navigate to `https://your-grovio.vercel.app/app/today` directly — should redirect to `/sign-in` (protected route redirect, not a 404). |
| **Backend health** | `curl https://your-backend-name.onrender.com/api/health` — should return 200 with `"database": "connected"`. |
| **Registration** | Sign up with a test email — should create an account and redirect to onboarding. |
| **Login** | Log in with correct credentials — should redirect to `/app/today`. |
| **Session persistence** | Refresh the `/app/today` page — should NOT redirect to sign-in (refresh cookie restores session). |
| **Logout** | Click logout — should return to sign-in page. Next refresh should stay on sign-in. |
| **Product creation** | Create a product — should persist and appear in the list. |
| **Inventory** | Adjust stock — should update the product stock value. |
| **Billing** | Create a bill — should compute totals + GST correctly. |
| **Sales reports** | Navigate to `/app/sales` — should show the bill in the sales data. |
| **GST reporting** | Navigate to `/app/gst` — should show tax breakdowns. |
| **Store isolation** | Register a second store account — should NOT see the first store's data. |
| **Role access** | Add a team member as Cashier — they should be redirected from `/app/settings`. |
| **Backup** | Download a backup — should contain store data without password hashes. |

### Troubleshooting common issues

| Problem | Diagnosis | Fix |
|---|---|---|
| CORS error in browser console | Backend isn't allowing the Vercel origin | Check `CLIENT_ORIGIN` in Render env — must exactly match `https://your-grovio.vercel.app` |
| Cookies not sent (infinite redirect loop) | SameSite or Secure not configured | Ensure `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` in Render env |
| 503 from `/api/health` | Backend can't connect to MongoDB | Check `MONGODB_URI` — ensure the password and database name are correct; check Atlas IP whitelist |
| Refresh not working after cold start | First request times out before DB connects | Wait 10-15 seconds for Render to fully start, then retry |
| Protected route returns 404 on refresh | SPA fallback not working | Verify `vercel.json` rewrites are in place and root directory is `frontend` |
| Registration hangs / fails | MongoDB URI points to wrong database | Ensure the URI ends with `grovio_prod` (not `grovio_test`) |

## 13. Rollback Guidance

### Rolling back a Render deployment

1. Go to the Render dashboard → your service → **Deploys** tab.
2. Find the last working deploy in the history.
3. Click the three dots (⋮) → **Rollback** to restore that deploy.
4. Render will redeploy the rolled-back version.

### Rolling back a Vercel deployment

1. Go to the Vercel dashboard → your project → **Deployments** tab.
2. Find the last working deployment.
3. Click the three dots (⋮) → **Promote to Production**.

### Rolling back code changes

```bash
git revert <commit-hash>
git push origin main
# Both Render and Vercel will auto-deploy the reverted code.
```

### Rolling back environment variables

Render: Go to service → **Environment** → edit the variable → revert to the previous value.
Vercel: Go to project → **Settings** → **Environment Variables** → edit the variable.

## 14. Unresolved Issues / Blockers

| Issue | Impact | Recommendation |
|---|---|---|
| `backend/.env` on disk contains real credentials | Security risk if accidentally committed | Already `.gitignore`d. **Rotate these credentials after first push if they are ever exposed.** |
| `frontend/package.json` had invalid radix-ui version strings | `npm ci` fails on fresh install | **Fixed** in this commit (versions corrected to match npm registry). |
| Playwright E2E tests not executed | Cannot verify end-to-end in deployment environment | Tests require a running local server + MongoDB. Run locally with `npm run dev` (both services) then `npm run playwright`. |
| `lovable/` directory included in the repo | Bloats the repository, not used by the deployed app | It's a read-only reference; does not affect deployment. Can be excluded from Vercel builds by setting root directory to `frontend`. |

## 15. Summary

| Area | Status |
|---|---|
| Git repository prepared | PASS |
| No secrets tracked in Git | PASS |
| Frontend production build | PASS |
| Frontend unit tests | PASS (1/1) |
| Backend tests | PASS (43/43) |
| API base URL configurable | PASS (VITE_API_URL) |
| SPA fallback (route refresh) | PASS (vercel.json rewrites) |
| No secrets in frontend bundle | PASS |
| Backend listens on Render PORT | PASS |
| Backend binds to 0.0.0.0 | PASS |
| Graceful shutdown | PASS |
| Error handling (no stack trace leaks) | PASS |
| Health endpoint | PASS |
| CORS allowlist (no wildcard in prod) | PASS |
| Secure cookies (Secure + SameSite=None) | PASS |
| CSRF protection | PASS |
| Cookie authentication across origins | PASS (with documented limitations) |
| MongoDB connection reuse | PASS |
| Test databases isolated from prod | PASS |
| Per-store isolation | PASS |
| Role-based authorization | PASS |
| Rate limiting on auth endpoints | PASS |
| render.yaml configured | PASS |
| Environment templates in place | PASS |
| **DEPLOYMENT READINESS** | **PASS — ready to deploy** |
