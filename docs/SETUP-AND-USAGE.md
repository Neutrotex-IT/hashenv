# HashEnv Setup and Usage Guide

HashEnv is a secure environment-variable and secrets manager. It stores `.env` files, standalone secrets, and associated service accounts with layered encryption, organization-based access control, audit logging, and API tokens for CI/CD.

This guide covers local setup, day-to-day usage, and the main operational workflows.

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Project structure](#project-structure)
3. [Local setup](#local-setup)
4. [Environment variables](#environment-variables)
5. [Running the app](#running-the-app)
6. [First-time usage](#first-time-usage)
7. [Core features](#core-features)
8. [API tokens (CI/CD)](#api-tokens-cicd)
9. [Authentication model](#authentication-model)
10. [Encryption overview](#encryption-overview)
11. [Root key rotation](#root-key-rotation)
12. [Production deployment](#production-deployment)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install these before you start:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Backend and frontend runtime |
| npm | 9+ | Package management |
| MongoDB | 6+ (local or Atlas) | Database |

Optional:

- **Brevo account** — for sending verification and password-reset emails in non-dev environments
- **Git** — for cloning the repository

---

## Project structure

```
hashenv/
├── backend/          # Express API (port 3001)
│   ├── src/
│   │   ├── crypto/   # 4-layer encryption
│   │   ├── routes/   # API routes
│   │   └── models/   # MongoDB models
│   └── scripts/      # Operational scripts (e.g. root key rotation)
├── frontend/         # Next.js app (port 3000)
│   ├── app/          # Pages
│   ├── components/
│   ├── contexts/     # Auth + Organization state
│   └── lib/api.ts    # API client
├── cli/              # HashEnv CLI (see docs/CLI.md)
└── docs/             # Documentation (see docs/README.md)
```

---

## Local setup

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd hashenv

cd backend
npm install

cd ../frontend
npm install
```

### 2. Create environment files

**Backend** — copy the example and fill in values:

```bash
cd backend
cp env.example .env
```

**Frontend** — create `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Generate required secrets

Generate a **JWT signing secret** and a **root encryption key**. Each must be at least 32 characters. Use either **OpenSSL** or **Node** — both produce a secure random base64 string.

**Option A — OpenSSL**

```bash
# JWT signing secret
openssl rand -base64 32

# Root encryption key (run again for a different value)
openssl rand -base64 32
```

**Option B — Node**

```bash
# JWT signing secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Root encryption key (run again for a different value)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste the outputs into `backend/.env`:

```env
JWT_SECRET=<first-generated-value>
ROOT_ENCRYPTION_KEY=<second-generated-value>
```

> **Important:** Use `ROOT_ENCRYPTION_KEY`, not `MASTER_ENCRYPTION_KEY`. The old single-key model has been replaced by the 4-layer encryption system. Generate **two separate values** — do not reuse the same string for both variables.

### 4. Start MongoDB

**Local MongoDB:**

```bash
mongod
```

**MongoDB Atlas:** create a free cluster and set `MONGODB_URI` in `backend/.env`.

For a fresh greenfield install, an empty database is fine. The server bootstraps encryption keys on first startup.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default: `3001`) |
| `NODE_ENV` | No | `development` or `production` |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | JWT signing secret (min 32 characters) |
| `ROOT_ENCRYPTION_KEY` | **Yes** | Root encryption key (min 32 characters) |
| `FRONTEND_URL` | **Yes** | Frontend URL for CORS and email links (e.g. `http://localhost:3000`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (overrides `FRONTEND_URL` for multiple domains) |
| `BREVO_API_KEY` | For email | Brevo API key for transactional email |
| `BREVO_SENDER_EMAIL` | For email | Verified sender address in Brevo |
| `BREVO_SENDER_NAME` | No | Display name for outgoing email |
| `BACKEND_URL` | Prod only | Public backend URL (used by health-ping cron on Render) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | Backend API base URL (e.g. `http://localhost:3001/api`) |

### Example `backend/.env` for local development

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

MONGODB_URI=mongodb://localhost:27017/hashenv

JWT_SECRET=<generated-32+-char-secret>
ROOT_ENCRYPTION_KEY=<generated-32+-char-secret>

# Optional for local dev — verification URLs are logged to the backend console
BREVO_API_KEY=
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=HashEnv
```

---

## Running the app

Open two terminals.

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
```

Expected output:

- `Connected to MongoDB`
- Encryption bootstrap success
- `Server running on port 3001`

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET http://localhost:3001/health` | Basic liveness |
| `GET http://localhost:3001/api/health` | App health + encryption status |

---

## First-time usage

### 1. Register an account

1. Go to **Login** → create an account.
2. On signup, HashEnv automatically creates a **personal organization** for you.
3. You must verify your email before logging in.

**Without Brevo configured:** registration still succeeds. Check the backend terminal for a line like:

```
========== EMAIL VERIFICATION (DEVELOPMENT MODE) ==========
Verification URL: http://localhost:3000/verify-email?token=...
```

Open that URL in your browser to verify.

### 2. Log in

After verification, sign in at `/login`. Sessions use:

- **Access token** — short-lived (15 min), kept in browser memory
- **Refresh token** — 7 days, stored in an HttpOnly cookie

You stay signed in across page reloads via automatic token refresh.

### 3. Create a project

1. Open the **Dashboard**.
2. Use the **organization switcher** (top of dashboard) to pick personal or team org.
3. Click **Create Project** and choose the target organization.
4. A project encryption key is created automatically.

### 4. Upload environment files

Inside a project:

1. Open the **Environments** tab.
2. Pick an environment (`dev`, `staging`, `prod`, or custom names like `qa`, `preview`).
3. Click **Upload New Version** and upload a `.env` file or paste content.
4. Download, compare versions, rollback, or edit (if you have write access).

#### Custom environment names

Projects default to `dev`, `staging`, and `prod`. Users with write access can add more from **Manage environments** on the project page:

- Slug pattern: `^[a-z][a-z0-9-]{1,31}$` (2–32 characters, lowercase)
- Up to **20** environments per project
- Reserved slugs blocked: `all`, `default`, `latest`
- Renaming an environment updates all historical versions for that slug
- Deleting an environment with uploaded files requires `?force=true` (removes all versions)

API tokens and `/api/v1` endpoints accept any configured slug via the `environment` query parameter or JSON body field.

### 5. Add secrets and associated accounts

From the project page:

- **Other Secrets** — store individual key/value secrets
- **Associated Accounts** — store credentials for linked services (Google, AWS, GitHub, etc.)

All sensitive data is encrypted with the project's encryption key.

---

## Core features

### Organizations

| Type | Created when | Use case |
|------|--------------|----------|
| `personal` | User registration | Individual workspace |
| `team` | Created manually via API | Shared team workspace |

**Roles:** `owner` > `admin` > `member`

- Owners/admins can manage org members and see all projects in the org.
- Members get access only to projects they are added to.

### Projects and permissions

Each project belongs to one organization.

| Permission | Can do |
|------------|--------|
| `read` | View and download env files, secrets, accounts |
| `write` | Upload, edit, create, delete |
| Project owner | Full control + member management + API tokens |

Org owners/admins implicitly have access to all projects in their organization.

### Audit logs and activity

Sensitive actions are logged: environment file changes, secret and account access, member changes, API token changes, logins, panic button, and more.

**Project activity (UI):** `/projects/<projectId>/activity`

- Unified timeline across env, secrets, accounts, tokens, and members
- Filter by resource type or environment
- Download env audit logs as `.txt` (respects environment filter)

**Legacy URL:** `/projects/<projectId>/logs` redirects to `/activity`.

**Session API examples:**

```bash
# Env-only audit logs (optional ?environment=dev)
GET /api/projects/:projectId/env/logs

# Filtered log download
GET /api/projects/:projectId/env/logs/download?environment=dev

# Unified activity feed (optional ?environment= & ?resourceType=)
GET /api/projects/:projectId/activity

# Compare two env versions
GET /api/projects/:projectId/env/diff?environment=dev&from=1&to=2
```

Organization-level audit logs are available via the organizations API and UI at `/organizations/<orgId>/audit`.

### Panic button

In **Settings**, configure the panic button to:

- Flush environment files
- Flush secrets and associated accounts
- Revoke API tokens
- Revoke collaborators
- Download env backups before wipe

Panic affects projects you created **and** projects in orgs where you are **owner** or **admin**. Your **password is always required** server-side when executing panic (in addition to any UI confirmation).

Use only in emergencies.

### Auto-flush

In **Settings**, set **Flush duration** (hours) to automatically delete environment files on a schedule. A backend cron job runs hourly and flushes env files for eligible projects when the interval has elapsed since the last run.

---

## HashEnv CLI

A command-line tool lives in `cli/`. Install locally:

```bash
cd cli
npm link
```

Configure:

```bash
export HASHENV_TOKEN=henv_YOUR_TOKEN
export HASHENV_PROJECT=YOUR_PROJECT_ID
export HASHENV_API_URL=http://localhost:3001/api/v1
```

Commands:

```bash
hashenv pull --env dev --output .env
hashenv run --env dev -- npm start
hashenv secret get MY_SECRET
hashenv env put --env dev --file .env
```

See [CLI.md](./CLI.md) for full usage.

---

## API tokens (CI/CD)

API tokens allow scripts and pipelines to access a **single project** without a browser session.

### Create a token (UI)

1. Open a project you own or have write access to.
2. Go to **Manage API Tokens** (project settings section) or `/projects/<id>/tokens`.
3. Create a token with `read` and/or `write` scope.
4. **Copy the token immediately** — it is shown only once.

Token format: `henv_<random-string>`

### Use a token

Pass it as a Bearer token:

```bash
# Download latest dev environment file
curl -H "Authorization: Bearer henv_YOUR_TOKEN" \
  "http://localhost:3001/api/v1/projects/PROJECT_ID/env?environment=dev"

# List environments
curl -H "Authorization: Bearer henv_YOUR_TOKEN" \
  "http://localhost:3001/api/v1/projects/PROJECT_ID/env/list"

# Upload environment file (write scope required)
curl -X PUT \
  -H "Authorization: Bearer henv_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"environment":"dev","content":"API_KEY=abc123\nDB_URL=postgres://..."}' \
  "http://localhost:3001/api/v1/projects/PROJECT_ID/env"

# List secrets (names only)
curl -H "Authorization: Bearer henv_YOUR_TOKEN" \
  "http://localhost:3001/api/v1/projects/PROJECT_ID/secrets"

# Get a secret by name
curl -H "Authorization: Bearer henv_YOUR_TOKEN" \
  "http://localhost:3001/api/v1/projects/PROJECT_ID/secrets/MY_SECRET_NAME"

# Create a secret (write scope required)
curl -X POST \
  -H "Authorization: Bearer henv_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"MY_SECRET_NAME","content":"secret-value"}' \
  "http://localhost:3001/api/v1/projects/PROJECT_ID/secrets"

# Update a secret (write scope required)
curl -X PUT \
  -H "Authorization: Bearer henv_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"new-value"}' \
  "http://localhost:3001/api/v1/projects/PROJECT_ID/secrets/MY_SECRET_NAME"

# Delete a secret (write scope required)
curl -X DELETE \
  -H "Authorization: Bearer henv_YOUR_TOKEN" \
  "http://localhost:3001/api/v1/projects/PROJECT_ID/secrets/MY_SECRET_NAME"
```

Token-authenticated requests are audited with `actorType: api_token`. Use any custom environment slug configured on the project (not only `dev` / `staging` / `prod`).

### Rate limits

API token requests are limited to **100 requests per minute per token**. Response headers:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Authentication model

| Layer | Storage | Lifetime |
|-------|---------|----------|
| Access JWT | Browser memory | 15 minutes |
| Refresh token | HttpOnly cookie (`/api/auth`) | 7 days |

**Auth endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in (returns access token + sets cookie) |
| `POST` | `/api/auth/refresh` | Get new access token from cookie |
| `POST` | `/api/auth/logout` | Revoke refresh token |
| `GET` | `/api/auth/me` | Current user profile |

The frontend API client (`frontend/lib/api.ts`) refreshes tokens automatically on `401` responses.

---

## Encryption overview

HashEnv uses a 4-layer key hierarchy:

```
ROOT_ENCRYPTION_KEY (env var, never stored in DB)
    └── Instance Key (wrapped in MongoDB)
            └── Organization DEK (per org)
                    └── Project DEK (per project)
                            └── Encrypted data (env files, secrets, accounts)
```

**On first startup:**

1. Server checks `ROOT_ENCRYPTION_KEY` is set.
2. If no instance key exists, one is generated and wrapped with the root key.
3. Org and project keys are created when those resources are created.

**If you lose `ROOT_ENCRYPTION_KEY`**, encrypted data cannot be recovered. Back it up securely.

See also: [ROOT-KEY-ROTATION.md](./ROOT-KEY-ROTATION.md)

---

## Root key rotation

To rotate `ROOT_ENCRYPTION_KEY` without re-encrypting all data, first generate a new key:

**OpenSSL:**

```bash
openssl rand -base64 32
```

**Node:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then run the rotation script:

```bash
cd backend

# Set current key and DB connection
export MONGODB_URI="your-mongodb-uri"
export ROOT_ENCRYPTION_KEY="your-current-key"

# Run rotation (paste the new key from above)
npx tsx scripts/rotate-root-key.ts "your-new-key-here"
```

Then update `ROOT_ENCRYPTION_KEY` in your environment and restart all server instances.

Full procedure: [ROOT-KEY-ROTATION.md](./ROOT-KEY-ROTATION.md)

---

## Production deployment

### Build commands

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm start
```

### Production checklist

See **[PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)** for the full deployment and env-var checklist. Summary:

1. Set `NODE_ENV=production`
2. Use HTTPS for both frontend and backend
3. Set `FRONTEND_URL` to your production frontend URL
4. Set `NEXT_PUBLIC_API_URL` to your production API URL (e.g. `https://api.yourdomain.com/api`)
5. Generate **new** `JWT_SECRET` and `ROOT_ENCRYPTION_KEY` for production using OpenSSL or Node (see [Generate required secrets](#3-generate-required-secrets)); do not reuse dev secrets
6. Configure Brevo for email delivery
7. Use MongoDB Atlas or a managed MongoDB instance with TLS
8. Ensure CORS allows only your frontend origin(s)

See [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) for a detailed deployment review.

### Cookie note

Refresh cookies use `secure: true` in production. Both frontend and API must be served over HTTPS, and the browser must be able to send cookies cross-origin (`withCredentials: true` is already configured in the frontend API client).

---

## Troubleshooting

### Server exits on startup: "Encryption bootstrap failed"

- `ROOT_ENCRYPTION_KEY` is missing or shorter than 32 characters.
- Fix: set a valid key in `backend/.env` and restart.

### "Email not verified" on login

- Complete email verification first.
- In dev without Brevo: copy the verification URL from the backend console after registration.

### CORS errors in the browser

- `FRONTEND_URL` must match the URL you open in the browser (including `http` vs `https`).
- For multiple origins, set `CORS_ORIGINS` as a comma-separated list.

### Login works but API calls return 401

- Ensure `NEXT_PUBLIC_API_URL` points to the correct backend.
- Cookies require the frontend to call the API with credentials; do not strip cookies in a reverse proxy.
- In production, both sites must use HTTPS.

### Cannot decrypt existing data after changing keys

- Changing `ROOT_ENCRYPTION_KEY` without running the rotation script makes existing data unreadable.
- Use `scripts/rotate-root-key.ts` to rotate safely.

### Fresh start (dev only)

If you are pre-production with no important data:

1. Drop the MongoDB database
2. Keep or regenerate `ROOT_ENCRYPTION_KEY`
3. Restart the backend — encryption keys bootstrap cleanly

---

## Quick reference

| What | URL (local) |
|------|-------------|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/api |
| Health | http://localhost:3001/api/health |
| Dashboard | http://localhost:3000/dashboard |
| Settings | http://localhost:3000/settings |
| API tokens | http://localhost:3000/projects/:id/tokens |

| Docs | Path |
|------|------|
| Root key rotation | `docs/ROOT-KEY-ROTATION.md` |
| Production checklist | `PRODUCTION_CHECKLIST.md` |
| Security improvements | `docs/SECURITY-IMPROVEMENTS.md` |

---

## Support workflow summary

```
Register → Verify email → Login
    → Select organization → Create project
        → Upload env files / add secrets / add accounts
        → Invite project members (optional)
        → Create API tokens for CI/CD (optional)
```

For security operations (key rotation, production hardening), start with the docs in `docs/` and `PRODUCTION_CHECKLIST.md`.
