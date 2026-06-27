# Deploying HashEnv on Dokploy (2 separate Application services)

This guide deploys **backend** and **frontend** from a **single Git monorepo** as **two independent Dokploy Application services** inside one Project. Each service is built from the `Dockerfile` inside its own subfolder (`backend/`, `frontend/`). This is **not** a Docker Compose deployment.

**Official Dokploy references (checked June 2026):**

- [Applications](https://docs.dokploy.com/docs/core/applications)
- [Build Type (Dockerfile)](https://docs.dokploy.com/docs/core/applications/build-type)
- [Advanced (ports, resources, health checks)](https://docs.dokploy.com/docs/core/applications/advanced)
- [Domains](https://docs.dokploy.com/docs/core/domains)
- [Installation](https://docs.dokploy.com/docs/core/installation)

### Production URLs (Neutrotex)

| Service | Public URL | Container port |
|---------|------------|----------------|
| Frontend | `https://hashenv.neutrotex.com` | `3000` |
| Backend API | `https://hashenv-api.neutrotex.com` | `3001` |
| Database | **MongoDB Atlas** (external) | — |

**Neutrotex env values (copy into Dokploy):**

| Variable | Value | Service | Type |
|----------|-------|---------|------|
| `FRONTEND_URL` | `https://hashenv.neutrotex.com` | Backend | Runtime |
| `NEXT_PUBLIC_API_URL` | `https://hashenv-api.neutrotex.com/api` | Frontend | **Both** |
| `CORS_ORIGINS` | `https://hashenv.neutrotex.com` | Backend | Runtime (optional — or use `FRONTEND_URL`) |

---

## Architecture

```text
Internet
   │
   ▼
Traefik (Dokploy, ports 80/443)
   │
   ├── hashenv.neutrotex.com  → frontend  (container :3000)
   └── hashenv-api.neutrotex.com  → backend   (container :3001)
                                  │
                                  ▼
                         MongoDB Atlas (cloud)
```

| Service | Folder | Container port | Dokploy service type |
|---------|--------|----------------|----------------------|
| Backend API | `backend/` | `3001` | Application |
| Web app (Next.js) | `frontend/` | `3000` | Application |
| Database | — | — | MongoDB Atlas (not hosted on Dokploy) |

---

## Prerequisites

### VPS

- Ubuntu 20.04+ / Debian 11+ (or any Docker-capable Linux)
- **2 GB+ RAM**, **30 GB+ disk** (Dokploy recommendation for Docker builds)
- Ports **80**, **443**, and **3000** free (Traefik + Dokploy UI)
- Root or sudo access

### Install Dokploy

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Open `http://<your-server-ip>:3000`, create the admin account, and finish setup.

### DNS

Create records pointing app subdomains to your **Dokploy VPS IP**:

| Host | Points to | Notes |
|------|-----------|-------|
| `hashenv.neutrotex.com` | VPS IP | Main frontend (canonical) |
| `hashenv-api.neutrotex.com` | VPS IP | Backend API |

If using a wildcard such as `*.neutrotex.com` → VPS IP, that covers **one** label only (`hashenv.neutrotex.com`, `hashenv-api.neutrotex.com`, etc.). It does **not** cover `www.hashenv.neutrotex.com` — see [www vs non-www](#www-vs-non-www-redirect) below.

**Example split DNS (Neutrotex):**

| Record | Target | Purpose |
|--------|--------|---------|
| `neutrotex.com` | Vercel | Marketing / company site |
| `www.neutrotex.com` | Vercel | Marketing www |
| `*.neutrotex.com` | App VPS | App subdomains (`hashenv`, `hashenv-api`, …) |
| `www.hashenv.neutrotex.com` | App VPS (explicit) | Required if you want www on the app — **not** covered by `*.neutrotex.com` |

Verify with:

```bash
dig hashenv.neutrotex.com +short
dig hashenv-api.neutrotex.com +short
dig www.hashenv.neutrotex.com +short   # if www support enabled
```

Both primary domains should return your app server IP.

### Repository (single monorepo, two deployable apps)

HashEnv is **one Git repository** with **two self-contained services**. Each service has its own `Dockerfile` inside its folder — there is **no Dockerfile at the repo root**.

You will create **two Dokploy Application services** in the same Project. Each application:

- Connects to the **same Git repo and branch**
- Uses a **different Build Path** (the service subfolder)
- Builds with the **Dockerfile inside that subfolder**

Do **not** use `docker-compose.yml` or `docker-compose.coolify.yml` for this Dokploy setup. Those files are for local smoke tests and Coolify only.

---

## Monorepo layout

Relevant structure (simplified):

```text
hashenv/                           ← Git repo root (Dokploy clones this)
├── backend/
│   ├── Dockerfile                 ← Backend image (Node.js / Express)
│   ├── .dockerignore
│   ├── env.example
│   ├── package.json
│   └── src/
├── frontend/
│   ├── Dockerfile                 ← Next.js image (multi-stage)
│   ├── .dockerignore
│   ├── package.json
│   ├── next.config.ts             ← output: 'standalone'
│   └── app/
├── docker-compose.yml             ← Local dev only — NOT used on Dokploy
├── docker-compose.coolify.yml     ← Coolify only — NOT used on Dokploy
└── docs/
    └── DOKPLOY-DEPLOY.md          ← This guide
```

Each Dockerfile only copies files from **its own folder** (`COPY package.json`, `COPY src`, etc.). None of them read from sibling folders. The Docker **build context must be the service folder**, not the repository root.

---

## Dokploy build settings (monorepo cheat sheet)

For **every** application, connect the same repository. Only these fields change per service:

| Dokploy field | Backend | Frontend |
|---------------|---------|----------|
| **Repository** | Same HashEnv repo | Same |
| **Branch** | e.g. `main` | Same |
| **Build Path** (monorepo subfolder) | `backend` | `frontend` |
| **Build Type** | `Dockerfile` | `Dockerfile` |
| **Dockerfile Path** | `Dockerfile` | `Dockerfile` |
| **Docker Context Path** | `.` | `.` |
| **Docker Build Stage** | *(empty)* | `production` |

### How Dokploy resolves paths

After cloning the repo, Dokploy conceptually runs:

```bash
# Backend — equivalent local command from repo root:
docker build -f backend/Dockerfile -t hashenv-backend backend/

# Frontend:
docker build -f frontend/Dockerfile --target production -t hashenv-frontend frontend/
```

In the Dokploy UI this maps to:

| UI field | Meaning for HashEnv |
|----------|---------------------|
| **Build Path** | `backend` or `frontend` — Dokploy `cd`s here before building |
| **Dockerfile Path** | `Dockerfile` — relative to Build Path (not repo root) |
| **Docker Context Path** | `.` — the Build Path folder itself (where `COPY` instructions read from) |
| **Docker Build Stage** | `production` for the Next.js frontend only |

### Correct vs incorrect

| Setup | Result |
|-------|--------|
| Build Path = `backend`, Dockerfile = `Dockerfile`, Context = `.` | Correct |
| Build Path = `/` (repo root), Dockerfile = `backend/Dockerfile` | Wrong — `COPY package.json` fails (file not in context) |
| Build Path = `backend`, Dockerfile = `backend/Dockerfile` | Wrong — path is relative to Build Path; use `Dockerfile` only |
| Build Path = `/`, Context = `.` | Wrong for HashEnv — context would include entire repo |

### Optional: auto-deploy only when a subfolder changes

If your Dokploy version supports **Watch Paths** (or similar), scope each app so unrelated commits do not trigger rebuilds:

| Application | Suggested watch paths |
|-------------|----------------------|
| Backend | `backend/**` |
| Frontend | `frontend/**` |

If watch paths are not available, a push to any folder may trigger both webhooks — that is normal for monorepos.

---

## Dockerfile review (Dokploy readiness)

### Backend — `backend/Dockerfile`

| Check | Status | Notes |
|-------|--------|-------|
| Binds all interfaces | OK | Express `app.listen(PORT)` listens on `0.0.0.0` by default |
| Exposes correct port | OK | `EXPOSE 3001` |
| Non-root user | OK | `hashenv` (UID 1001) |
| Layer caching | OK | `package-lock.json` copied before app code |
| `.dockerignore` | OK | Excludes `.env`, tests, scripts |
| Multi-stage | OK | `deps` → `builder` → `runner` |
| `HEALTHCHECK` in image | OK | Hits `http://127.0.0.1:3001/health` |

**Verdict:** Ready for Dokploy. No Dockerfile change required.

### Frontend — `frontend/Dockerfile`

| Check | Status | Notes |
|-------|--------|-------|
| Multi-stage build | OK | `deps` → `builder` → `production` |
| Next.js standalone | OK | `output: 'standalone'` in `next.config.ts` |
| Production stage | OK | Must set **Docker Build Stage** = `production` in Dokploy |
| Binds `0.0.0.0` | OK | `HOSTNAME=0.0.0.0` |
| Non-root user | OK | `nextjs` user |
| `NEXT_PUBLIC_API_URL` as `ARG` | OK | Must be passed as **Build Time Arguments** in Dokploy |
| `.dockerignore` | OK | Excludes `node_modules`, `.next` |
| `HEALTHCHECK` in image | OK | Hits `http://127.0.0.1:3000/` |

**Verdict:** Ready for Dokploy. Set **Docker Build Stage** = `production`.

---

## Step 1 — Create a Dokploy Project

1. In the Dokploy dashboard, click **Create Project** (e.g. name: `HashEnv`).
2. Open the default environment (usually **production**).
3. You will add **two Application services** here — one per subfolder (`backend`, `frontend`). Database is external on Atlas.

---

## Step 2 — MongoDB Atlas

HashEnv uses **MongoDB Atlas** (not a Dokploy database service).

1. In [MongoDB Atlas](https://cloud.mongodb.com), create or open your cluster.
2. **Database Access:** create a user with read/write on your database (e.g. `hashenv`).
3. **Network Access:** add your **VPS public IP** (or `0.0.0.0/0` temporarily for testing — restrict in production).
4. **Connect → Drivers:** copy the connection string, e.g.:
   ```text
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/hashenv?retryWrites=true&w=majority
   ```
5. Set this as `MONGODB_URI` on the **backend** application in Dokploy (Step 3).

No MongoDB service is created inside Dokploy for this deployment.

---

## Step 3 — Deploy the Backend (`backend/`)

### 3.1 Create the application

1. **Create Service** → **Application**.
2. **Name:** `hashenv-backend`
3. **App Name:** `hashenv-backend` — Dokploy appends a random 6-character suffix for the internal Swarm service name (e.g. `hashenv-backend-xk9m2p`). The suffixed name is only needed if you add server-side inter-service calls later; HashEnv's frontend talks to the API over the public URL from the browser.

### 3.2 General tab — Source & build (monorepo)

Connect the **HashEnv monorepo**. Point Dokploy at the `backend/` subfolder:

| Field | Value | Notes |
|-------|-------|-------|
| **Source** | Git provider + **same repo** as frontend | One repo, two applications |
| **Branch** | e.g. `main` | Same branch for both |
| **Build Path** | `backend` | Not `/` — this is the folder containing `backend/Dockerfile` |
| **Build Type** | `Dockerfile` | |
| **Dockerfile Path** | `Dockerfile` | Resolves to `backend/Dockerfile` on disk |
| **Docker Context Path** | `.` | Context = `backend/` (matches `docker build ... backend/`) |
| **Docker Build Stage** | *(leave empty)* | Final stage is `runner` |

### 3.3 Environment tab — Runtime variables

Add all variables below in **Environment** only (runtime). See [Environment variables — complete reference](#environment-variables--complete-reference) for the full list.

| Variable | Type | Required | Example / notes |
|----------|------|----------|-----------------|
| `MONGODB_URI` | Runtime | **Yes** | Atlas URI, e.g. `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/hashenv?retryWrites=true&w=majority` |
| `JWT_SECRET` | Runtime | **Yes** | Long random string — min 32 chars (`openssl rand -hex 32`) |
| `ROOT_ENCRYPTION_KEY` | Runtime | **Yes** | Base64-encoded 32-byte key — **losing this key loses all encrypted secrets** |
| `FRONTEND_URL` | Runtime | **Yes** | `https://hashenv.neutrotex.com` — used for CORS and email links |
| `BREVO_API_KEY` | Runtime | **Yes** (if email enabled) | From [Brevo API keys](https://app.brevo.com/settings/keys/api) |
| `BREVO_SENDER_EMAIL` | Runtime | **Yes** (if email enabled) | Verified sender in Brevo, e.g. `noreply@neutrotex.com` |
| `NODE_ENV` | Runtime | **Yes** | `production` |
| `PORT` | Runtime | Optional | `3001` (default) |
| `CORS_ORIGINS` | Runtime | Optional | Comma-separated list if you need multiple origins instead of `FRONTEND_URL` alone |
| `BREVO_SENDER_NAME` | Runtime | Optional | Display name in emails, e.g. `HashEnv` |
| `BACKEND_URL` | Runtime | Optional | Public API origin without trailing slash — only needed on platforms that sleep idle backends (Render). **Not required on Dokploy.** |

Generate secrets:

```bash
# JWT secret (hex)
openssl rand -hex 32

# Root encryption key (base64, 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Backup `ROOT_ENCRYPTION_KEY` securely** before first deploy. See [ROOT-KEY-ROTATION.md](./ROOT-KEY-ROTATION.md).

**CORS example** (single canonical frontend):

```env
FRONTEND_URL=https://hashenv.neutrotex.com
```

Or with explicit multi-origin list:

```env
CORS_ORIGINS=https://hashenv.neutrotex.com,https://www.hashenv.neutrotex.com
```

### 3.4 Domains tab

Click **Create Domain**:

| Field | Value |
|-------|-------|
| **Host** | `hashenv-api.neutrotex.com` |
| **Path** | `/` |
| **Container Port** | `3001` |
| **HTTPS** | ON |
| **Certificate** | `letsencrypt` |

> **Important:** Container Port is for Traefik routing only. Users access `https://hashenv-api.neutrotex.com` without `:3001` in the URL. Do **not** confuse this with **Advanced → Ports** (which exposes host ports publicly).

### 3.5 Advanced tab (optional)

- **Swarm Settings → Health Check:** command can hit `http://127.0.0.1:3001/health` or `/api/health`.
- **Resources:** recommend **512 MB–1 GB** memory limit for the backend.
- **Ports:** leave empty unless you need raw `http://<vps-ip>:3001` access.

### 3.6 Deploy

Click **Deploy**. Wait until logs show the server listening on port `3001`. Verify:

```text
https://hashenv-api.neutrotex.com/health
https://hashenv-api.neutrotex.com/api/health
```

Both should return a healthy JSON response.

---

## Step 4 — Deploy the Frontend (`frontend/`)

### 4.1 Create the application

1. **Create Service** → **Application** (second app in the same Project).
2. **Name:** `hashenv-frontend`
3. **App Name:** `hashenv-frontend`

### 4.2 General tab — Source & build (monorepo)

Same Git repo and branch as backend; different subfolder:

| Field | Value | Notes |
|-------|-------|-------|
| **Source** | Same HashEnv repo | |
| **Branch** | Same as backend | |
| **Build Path** | `frontend` | Folder with `frontend/Dockerfile` |
| **Build Type** | `Dockerfile` | |
| **Dockerfile Path** | `Dockerfile` | Resolves to `frontend/Dockerfile` |
| **Docker Context Path** | `.` | Context = `frontend/` |
| **Docker Build Stage** | `production` | Required — skips intermediate build stages |

### 4.3 Environment tab

HashEnv's frontend is a **client-side app** (no Next.js middleware, no server-side API proxy). All API calls use `NEXT_PUBLIC_API_URL` from the browser bundle. You do **not** need an internal `API_URL_INTERNAL` variable.

Set variables in **both** Dokploy sections where the **Type** column says **Both**. See [Environment variables — complete reference](#environment-variables--complete-reference).

#### Runtime variables (Environment tab)

| Variable | Type | Required | Value |
|----------|------|----------|-------|
| `NEXT_PUBLIC_API_URL` | **Both** | **Yes** | `https://hashenv-api.neutrotex.com/api` |
| `NODE_ENV` | Runtime | Optional | `production` (already set in Dockerfile) |
| `PORT` | Runtime | Optional | `3000` (already set in Dockerfile) |
| `HOSTNAME` | Runtime | Optional | `0.0.0.0` (already set in Dockerfile) |

> **`NEXT_PUBLIC_API_URL` must include the `/api` suffix.** The frontend axios client appends paths like `/auth/login` to this base URL.

#### Build Time Arguments

| Variable | Type | Required | Value |
|----------|------|----------|-------|
| `NEXT_PUBLIC_API_URL` | **Both** | **Yes** | `https://hashenv-api.neutrotex.com/api` |

> `NEXT_PUBLIC_*` values are **inlined at `next build`**. Changing them requires updating **Build Time Arguments** and a **full redeploy/rebuild** — updating runtime env alone will not fix the browser bundle or Content-Security-Policy `connect-src`.

### 4.4 Domains tab

**Primary domain** (canonical — serves the app):

| Field | Value |
|-------|-------|
| **Host** | `hashenv.neutrotex.com` |
| **Path** | `/` |
| **Container Port** | `3000` |
| **HTTPS** | ON |
| **Certificate** | `letsencrypt` |

**Optional www domain** (required if you redirect `www` → non-www): add a second domain entry:

| Field | Value |
|-------|-------|
| **Host** | `www.hashenv.neutrotex.com` |
| **Path** | `/` |
| **Container Port** | `3000` |
| **HTTPS** | ON |
| **Certificate** | `letsencrypt` |

Traefik must know about the `www` host before a redirect can run. Without this domain entry (and DNS), `www.hashenv.neutrotex.com` returns **404 page not found**.

### 4.5 www → non-www redirect (recommended)

On the **frontend** application: **Advanced** → **Redirects** → use the **Redirect to non-www** preset (canonical = `hashenv.neutrotex.com`):

| Field | Value |
|-------|-------|
| **Preset** | Redirect to non-www |
| **Regex** | `^https?://www.(.+)` |
| **Replacement** | `https://$1` |
| **Permanent** | ON (301) |

After adding domains or redirects, **redeploy** the frontend application.

The API subdomain (`hashenv-api.neutrotex.com`) does not need a `www` variant.

### 4.6 Deploy

Deploy **after** the backend is healthy. Verify:

- `https://hashenv.neutrotex.com` loads
- Browser network tab shows API calls to `https://hashenv-api.neutrotex.com/api/...` (not `localhost`)
- Registration / login / email verification work (if Brevo is configured)

---

## Build time vs runtime environment variables

Dokploy has **two separate places** for configuration when using Dockerfile builds:

| Dokploy UI section | When it applies | Maps to |
|--------------------|-----------------|---------|
| **Environment** (runtime) | Container start | `docker run -e ...` |
| **Build Time Arguments** | `docker build` only, during `npm run build` | Dockerfile `ARG` |

### Type legend

| Type | Meaning | Dokploy location |
|------|---------|------------------|
| **Runtime** | Read when the container starts / on each request | **Environment** tab only |
| **Build** | Baked into the image during `docker build`; changing it requires a **full rebuild** | **Build Time Arguments** only |
| **Both** | Must be set in **Build Time Arguments** (for the client bundle) **and** duplicated in **Environment** (recommended) | Both tabs |

Getting build vs runtime wrong is the most common deployment mistake for Next.js apps.

### How HashEnv uses env

- **`NEXT_PUBLIC_*`** — Inlined into the **browser JavaScript bundle** and **Content-Security-Policy** headers at `next build`. The browser never reads Dokploy runtime env for these.
- **Backend `process.env.*`** — All **runtime** only. The backend Dockerfile has no `ARG` directives.
- **No server-side API proxy** — HashEnv does not call the backend from Next.js middleware. All API traffic is browser → public API URL.
- **Dockerfile defaults** — `PORT`, `HOSTNAME`, and `NODE_ENV` are already set in the frontend Dockerfile. You do not need to pass them unless overriding.

---

## Environment variables — complete reference

### Backend (`hashenv-backend`) — all runtime

Set every backend variable in **Environment** only. Do **not** add backend vars to **Build Time Arguments**.

| Variable | Type | Required | Dokploy tab | Example / notes |
|----------|------|----------|-------------|-----------------|
| `MONGODB_URI` | Runtime | **Yes** | Environment | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/hashenv?retryWrites=true&w=majority` |
| `JWT_SECRET` | Runtime | **Yes** | Environment | Min 32 chars — `openssl rand -hex 32` |
| `ROOT_ENCRYPTION_KEY` | Runtime | **Yes** | Environment | Base64 32-byte key — **backup securely; losing it loses all encrypted data** |
| `FRONTEND_URL` | Runtime | **Yes** | Environment | `https://hashenv.neutrotex.com` — CORS (single origin) and email links |
| `NODE_ENV` | Runtime | **Yes** | Environment | `production` |
| `BREVO_API_KEY` | Runtime | **Yes** (if email) | Environment | [Brevo API key](https://app.brevo.com/settings/keys/api) |
| `BREVO_SENDER_EMAIL` | Runtime | **Yes** (if email) | Environment | Verified sender, e.g. `noreply@neutrotex.com` |
| `CORS_ORIGINS` | Runtime | Optional | Environment | Comma-separated origins — use instead of `FRONTEND_URL` when you need multiple |
| `BREVO_SENDER_NAME` | Runtime | Optional | Environment | Email display name, e.g. `HashEnv` |
| `BREVO_FROM_EMAIL` | Runtime | Optional | Environment | Alias for `BREVO_SENDER_EMAIL` |
| `BREVO_DISPLAY_NAME` | Runtime | Optional | Environment | Alias for `BREVO_SENDER_NAME` |
| `BREVO_API_URL` | Runtime | Optional | Environment | Defaults to `https://api.brevo.com/v3/smtp/email` |
| `PORT` | Runtime | Optional | Environment | Default `3001` |
| `MONGODB_TLS` | Runtime | Optional | Environment | `true` / `false` — auto-detected from `mongodb+srv://` URI if unset |
| `BACKEND_URL` | Runtime | Optional | Environment | Public API origin (no trailing slash). **Not needed on Dokploy** — only for platforms that sleep idle backends (Render) |

### Frontend (`hashenv-frontend`)

| Variable | Type | Required | Dokploy tab | Example / notes |
|----------|------|----------|-------------|-----------------|
| `NEXT_PUBLIC_API_URL` | **Both** | **Yes** | **Build Time Arguments** + **Environment** | `https://hashenv-api.neutrotex.com/api` — **must include `/api` suffix** |
| `NODE_ENV` | Runtime | Optional | Environment | Already `production` in Dockerfile — override only if needed |
| `PORT` | Runtime | Optional | Environment | Already `3000` in Dockerfile |
| `HOSTNAME` | Runtime | Optional | Environment | Already `0.0.0.0` in Dockerfile — required for Traefik if overriding |

> **`NEXT_PUBLIC_API_URL` is the only variable that must be set in both places.** All other frontend vars are runtime-only (or already baked into the Dockerfile).

### Summary by type

| Type | Variables | Service |
|------|-----------|---------|
| **Runtime only** | `MONGODB_URI`, `JWT_SECRET`, `ROOT_ENCRYPTION_KEY`, `FRONTEND_URL`, `CORS_ORIGINS`, `BREVO_*`, `MONGODB_TLS`, `BACKEND_URL`, `PORT`, `NODE_ENV` | Backend |
| **Runtime only** | `NODE_ENV`, `PORT`, `HOSTNAME` | Frontend (optional — defaults in Dockerfile) |
| **Build only** | *(none)* | — |
| **Both** | `NEXT_PUBLIC_API_URL` | Frontend |

### Master matrix (quick lookup)

| Variable | Service | Build | Runtime | Set both? |
|----------|---------|:-----:|:-------:|:---------:|
| `MONGODB_URI` | Backend | — | Yes | Runtime only |
| `JWT_SECRET` | Backend | — | Yes | Runtime only |
| `ROOT_ENCRYPTION_KEY` | Backend | — | Yes | Runtime only |
| `FRONTEND_URL` | Backend | — | Yes | Runtime only |
| `CORS_ORIGINS` | Backend | — | Optional | Runtime only |
| `BREVO_API_KEY` | Backend | — | Yes | Runtime only |
| `BREVO_SENDER_EMAIL` | Backend | — | Yes | Runtime only |
| `BREVO_SENDER_NAME` | Backend | — | Optional | Runtime only |
| `BREVO_FROM_EMAIL` | Backend | — | Optional | Runtime only |
| `BREVO_DISPLAY_NAME` | Backend | — | Optional | Runtime only |
| `BREVO_API_URL` | Backend | — | Optional | Runtime only |
| `MONGODB_TLS` | Backend | — | Optional | Runtime only |
| `BACKEND_URL` | Backend | — | Optional | Runtime only |
| `NODE_ENV` | Backend | — | Yes | Runtime only |
| `PORT` | Backend | — | Optional | Runtime only |
| `NEXT_PUBLIC_API_URL` | Frontend | **Yes** | **Yes** | **Yes** |
| `NODE_ENV` | Frontend | — | Optional | Runtime only (default in Dockerfile) |
| `PORT` | Frontend | — | Optional | Runtime only (default in Dockerfile) |
| `HOSTNAME` | Frontend | — | Optional | Runtime only (default in Dockerfile) |

### When you change a variable

| Change type | Action |
|-------------|--------|
| Any backend variable | Update **Environment** → **Redeploy** (no rebuild needed) |
| `FRONTEND_URL` / `CORS_ORIGINS` | Update backend **Environment** → **Redeploy** |
| `NEXT_PUBLIC_API_URL` | Update **Build Time Arguments** **and** **Environment** → **Redeploy** (forces **full image rebuild**) |
| `NODE_ENV` / `PORT` / `HOSTNAME` on frontend | Update **Environment** → **Redeploy** (usually unnecessary — already in Dockerfile) |

---

## Environment variables — copy-paste templates

### Backend — runtime only (`hashenv-backend` → Environment)

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/hashenv?retryWrites=true&w=majority
JWT_SECRET=
ROOT_ENCRYPTION_KEY=
FRONTEND_URL=https://hashenv.neutrotex.com
NODE_ENV=production
PORT=3001
BREVO_API_KEY=
BREVO_SENDER_EMAIL=noreply@neutrotex.com
BREVO_SENDER_NAME=HashEnv
# Optional — use instead of FRONTEND_URL when you need multiple origins:
# CORS_ORIGINS=https://hashenv.neutrotex.com,https://www.hashenv.neutrotex.com
# Optional — not needed on Dokploy:
# BACKEND_URL=https://hashenv-api.neutrotex.com
```

### Frontend — build time (`hashenv-frontend` → Build Time Arguments)

```env
NEXT_PUBLIC_API_URL=https://hashenv-api.neutrotex.com/api
```

### Frontend — runtime (`hashenv-frontend` → Environment)

```env
NEXT_PUBLIC_API_URL=https://hashenv-api.neutrotex.com/api
NODE_ENV=production
```

> Duplicate `NEXT_PUBLIC_API_URL` in both **Build Time Arguments** and **Environment**. Values must match.

---

## www vs non-www (redirect)

### Recommended approach: 301 redirect to one canonical URL

Pick **one** canonical frontend URL. Redirect the other with a permanent (301) redirect.

| Canonical | Dokploy preset | Users end up at |
|-----------|----------------|-----------------|
| `hashenv.neutrotex.com` | **Redirect to non-www** | Apex |
| `www.hashenv.neutrotex.com` | Redirect to www | www |

Set `FRONTEND_URL` on the backend to the **canonical** URL (the one users land on after redirect).

### DNS: wildcard `*.neutrotex.com` is not enough for www

A wildcard `*.neutrotex.com` matches only **one** subdomain level:

| Host | Matched by `*.neutrotex.com`? |
|------|-------------------------------|
| `hashenv.neutrotex.com` | Yes |
| `hashenv-api.neutrotex.com` | Yes |
| `www.hashenv.neutrotex.com` | **No** — two labels (`www` + `hashenv`) |

Add an **explicit** record for `www.hashenv` if you want www support:

```text
www.hashenv.neutrotex.com  →  A  →  <app VPS IP>
```

or:

```text
www.hashenv.neutrotex.com  →  CNAME  →  hashenv.neutrotex.com
```

`www.neutrotex.com` pointing to Vercel does **not** affect `www.hashenv.neutrotex.com` — they are different hostnames.

### Dokploy setup checklist (www support)

1. DNS: explicit `www.hashenv.neutrotex.com` → app VPS IP.
2. **Domains:** add `www.hashenv.neutrotex.com` on the frontend app (port `3000`, HTTPS).
3. **Advanced → Redirects:** preset **Redirect to non-www**, Permanent ON.
4. **Redeploy** frontend after domain/redirect changes.
5. Update backend `CORS_ORIGINS` if both hostnames serve traffic without redirect.

---

## CORS configuration

`FRONTEND_URL` or `CORS_ORIGINS` on the backend must include every browser origin that **actually calls the API** (exact scheme + host, no trailing slashes).

**With www → non-www redirect (recommended)** — only canonical frontend:

```env
FRONTEND_URL=https://hashenv.neutrotex.com
```

**If both www and non-www serve the app without redirect** — use `CORS_ORIGINS`:

```env
CORS_ORIGINS=https://hashenv.neutrotex.com,https://www.hashenv.neutrotex.com
```

The API subdomain (`hashenv-api.neutrotex.com`) does not need to be in CORS — browsers call it cross-origin from the frontend, and CORS is configured on the backend to allow the **frontend origin**, not the API's own origin.

---

## Dokploy UI map (where to enter what)

| What | Dokploy location |
|------|------------------|
| Git repo & branch (same for both apps) | Application → **General** |
| Monorepo subfolder (`backend` / `frontend`) | Application → **General** → **Build Path** |
| Dockerfile inside subfolder | Application → **General** → **Dockerfile Path** = `Dockerfile` |
| Docker build context | Application → **General** → **Docker Context Path** = `.` |
| Next.js production stage | Application → **General** → **Docker Build Stage** = `production` |
| Runtime env vars | Application → **Environment** |
| Build-time vars (`NEXT_PUBLIC_*`) | Application → **Environment** → **Build Time Arguments** |
| Env var types (runtime / build / both) | [Complete reference](#environment-variables--complete-reference) |
| Public domain + SSL | Application → **Domains** → Create Domain |
| www → non-www redirect | Application → **Advanced** → **Redirects** |
| Internal container port for Traefik | Domains → **Container Port** (`3000` / `3001`) |
| Raw host port exposure | Application → **Advanced** → **Ports** (usually **not needed**) |
| CPU / memory limits | Application → **Advanced** → **Resources** |
| Health checks | Application → **Advanced** → **Swarm Settings** (image already includes `HEALTHCHECK`) |
| Deploy / rebuild | Application → **General** → **Deploy** |
| Logs | Application → **Logs** |
| Auto-deploy on git push | Application → **Deployments** → Webhook URL |
| Limit rebuilds to subfolder changes | Application → **General** → **Watch Paths** (if available) |

---

## Deployment order

1. Install Dokploy on VPS; open ports 80, 443, 3000.
2. Create **one** Project + environment.
3. Configure **MongoDB Atlas** (whitelist VPS IP, copy connection string).
4. Generate and securely store `JWT_SECRET` and `ROOT_ENCRYPTION_KEY`.
5. Create Application **`hashenv-backend`** → Build Path `backend` → domain `hashenv-api.neutrotex.com` → deploy → confirm health endpoints.
6. Create Application **`hashenv-frontend`** → Build Path `frontend` → build args → domain `hashenv.neutrotex.com` (+ optional www + redirect) → deploy.
7. Set `FRONTEND_URL` / `CORS_ORIGINS` on backend to match the canonical frontend URL; redeploy backend if needed.
8. Test auth flows and Brevo transactional email (register, verify, password reset).

Unlike Docker Compose, there is no `depends_on` across Dokploy applications. Deploy backend first, then frontend.

---

## Local Docker smoke test (before Dokploy)

From the repo root, with `backend/.env` configured (Atlas URI, secrets, etc.):

```bash
docker compose up --build
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:3001/api/health](http://localhost:3001/api/health)

This uses `docker-compose.yml` — not deployed on Dokploy.

---

## Dokploy vs Coolify (this repo)

| Topic | Coolify (`docker-compose.coolify.yml`) | Dokploy (this guide) |
|-------|----------------------------------------|----------------------|
| Service model | One Compose stack, 2 services | 2 separate Applications |
| Monorepo build | `build.context: ./backend` per service | Per-app **Build Path** = `backend` / `frontend` |
| Dockerfile location | `backend/Dockerfile`, etc. | **Dockerfile Path** = `Dockerfile` (relative to Build Path) |
| Docker context | `./backend` in compose | **Docker Context Path** = `.` (relative to Build Path) |
| `NEXT_PUBLIC_*` at build | Coolify build args in compose | Dokploy **Build Time Arguments** |
| Domain port syntax | Coolify FQDN per service | Dokploy: host only + separate **Container Port** |
| Health-gated startup | Compose `depends_on: service_healthy` | Manual deploy order |

---

## Troubleshooting

### Docker build fails: `package.json` not found

- **Build Path** is wrong — it must be `backend` or `frontend`, not `/` or empty.
- **Dockerfile Path** must be `Dockerfile`, not `backend/Dockerfile`.
- **Docker Context Path** must be `.` (the service folder).

### Frontend build fails or CSP blocks API calls

- `NEXT_PUBLIC_API_URL` was not set in **Build Time Arguments** → fix value (must include `/api` suffix) and **redeploy** (full rebuild).
- CSP `connect-src` in `next.config.ts` is derived from `NEXT_PUBLIC_API_URL` at build time.

### `www.hashenv.neutrotex.com` returns 404

1. **DNS:** wildcard does not cover `www.app.*`. Add an explicit A or CNAME record.
2. **Dokploy Domains:** no entry for `www.hashenv.neutrotex.com` on the frontend app.
3. **Redirect without redeploy:** after adding domain or redirect rules, **redeploy** the frontend.

### 502 / domain not routing

- Confirm frontend listens on `0.0.0.0:3000` and backend on port `3001` (both Dockerfiles do).
- **Domains → Container Port** must match `3000` or `3001`.
- If you added/changed a domain after deploy, **redeploy** the application.
- Check **Logs** and Traefik: `docker logs dokploy-traefik`.

### SSL / Let's Encrypt fails

- DNS A record must point to the VPS before enabling HTTPS.
- Ports 80 and 443 must be reachable from the internet (HTTP-01 challenge).

### CORS errors in browser

- Set `FRONTEND_URL` to the exact origin the browser uses (scheme + host, no trailing slash).
- Or set `CORS_ORIGINS` with all allowed frontend origins.
- Redeploy backend after changing CORS.

### MongoDB connection refused (Atlas)

- Confirm **Network Access** in Atlas includes your VPS public IP.
- Verify `MONGODB_URI` uses the correct user, password, and database name (URL-encode special characters in the password).
- Use the `mongodb+srv://` string from Atlas, not `localhost`.
- Check backend **Logs** for authentication or TLS errors.

### Encryption / secrets unreadable after redeploy

- `ROOT_ENCRYPTION_KEY` must be set and **stable across redeploys**. Rotating it without following [ROOT-KEY-ROTATION.md](./ROOT-KEY-ROTATION.md) makes existing encrypted data unreadable.

### Email not sending (Brevo)

- Verify `BREVO_API_KEY` is valid.
- `BREVO_SENDER_EMAIL` must be a **verified sender** in your Brevo account.
- Check backend logs for Brevo API errors on register / password-reset flows.

### Auth cookies not persisting

- Frontend and API must both use **HTTPS** in production (`secure` cookies are set when `NODE_ENV=production`).
- `FRONTEND_URL` must match the URL users actually visit.
- API calls must go to the public API domain, not an internal hostname.

---

## Post-deploy checklist

- [ ] `https://hashenv-api.neutrotex.com/health` returns healthy
- [ ] `https://hashenv-api.neutrotex.com/api/health` returns healthy
- [ ] `https://hashenv.neutrotex.com` loads
- [ ] `https://www.hashenv.neutrotex.com` 301-redirects to canonical URL (if www enabled)
- [ ] Browser network tab shows API calls to `https://hashenv-api.neutrotex.com/api/...` (not `localhost`)
- [ ] Register, login, email verification, and password reset work
- [ ] `ROOT_ENCRYPTION_KEY` backed up securely offline
- [ ] MongoDB Atlas network access restricted to VPS IP (not `0.0.0.0/0`)
- [ ] Both apps set to auto-deploy webhook (optional)

---

## Example secrets template

Use `backend/env.example` for additional backend variable names. **Never commit real secrets to Git.**

| Variable | Service | Type | Dokploy tab |
|----------|---------|------|-------------|
| `MONGODB_URI` | Backend | Runtime | Environment |
| `JWT_SECRET` | Backend | Runtime | Environment |
| `ROOT_ENCRYPTION_KEY` | Backend | Runtime | Environment |
| `FRONTEND_URL` | Backend | Runtime | Environment |
| `BREVO_API_KEY` | Backend | Runtime | Environment |
| `BREVO_SENDER_EMAIL` | Backend | Runtime | Environment |
| `NODE_ENV` | Backend | Runtime | Environment |
| `NEXT_PUBLIC_API_URL` | Frontend | **Both** | Build Time Arguments **+** Environment |

```env
# Backend → hashenv-backend → Environment (runtime only)
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<openssl rand -hex 32>
ROOT_ENCRYPTION_KEY=<node -e "crypto.randomBytes(32).toString('base64')">
FRONTEND_URL=https://hashenv.neutrotex.com
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=noreply@neutrotex.com
NODE_ENV=production

# Frontend → hashenv-frontend → Build Time Arguments AND Environment (both)
NEXT_PUBLIC_API_URL=https://hashenv-api.neutrotex.com/api
```
