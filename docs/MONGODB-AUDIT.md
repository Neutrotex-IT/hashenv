# MongoDB Audit: Connection, Schema, and Query Optimization

**Date:** 2026-08-21  
**Stack:** Mongoose 8.x, Express (long-running), MongoDB Atlas **M0 (free)**  
**Scope:** `backend/src` models, connection bootstrap, and hot query paths  
**MCP:** MongoDB / Atlas MCP not connected — findings are code-based. Re-verify with Atlas Performance Advisor and `explain()` when available.

---

## Assumptions (connection recommendations)

These assumptions drive pool and timeout choices. Adjust if they do not match production.

| Assumption | Value used |
|------------|------------|
| Deployment | Single traditional Node/Express process (not serverless) |
| Atlas tier | M0 free (shared CPU/RAM, ~500 connection ceiling) |
| Workload | OLTP (auth, CRUD secrets/env files, occasional aggregations) |
| Concurrency | Low to moderate (internal / small-team product) |
| Replica set | Atlas default (driver opens monitoring sockets per member) |

---

## 1. Connection audit (`/mongodb-connection`)

### What was wrong

Your Atlas URI had **no database path**:

```text
mongodb+srv://...@....mongodb.net/?appName=NTXI-Hashenv
```

Without a path (and without `dbName`), the Node driver uses database **`test`**. That is why data appeared under `test`.

### Changes applied

| Change | Why |
|--------|-----|
| `MONGODB_DB_NAME` env (default `hashenv`) passed as `dbName` | Explicit DB even when URI has no path |
| `maxPoolSize: 20` | One app instance on M0; default 100 is more than needed and wastes shared resources |
| `minPoolSize: 0` | Do not hold idle sockets on free tier |
| `maxIdleTimeMS: 60000` | Prune idle connections between quiet periods |
| `connectTimeoutMS: 10000` | Fail fast on network / Atlas issues |
| Existing `serverSelectionTimeoutMS` / `socketTimeoutMS` kept | Sensible for OLTP |
| SIGINT / SIGTERM close | Return pooled connections cleanly on deploy/restart |

### Practices already followed

- Single shared `mongoose.connect` (client reused; no per-request connect)
- TLS enabled for `mongodb+srv://`
- `retryWrites: true`, `w: 'majority'`
- Connection errors do not log the full URI

### Practices still recommended (not required for M0 today)

| Item | Notes |
|------|--------|
| Prefer 1 app replica on M0 | Each process multiplies `(maxPoolSize + 2) × replica members` |
| Monitor `connections.current` in Atlas Metrics | Raise `maxPoolSize` only if wait-queue timeouts appear and server CPU is not saturated |
| IP allowlist | Prefer VPS IP over `0.0.0.0/0` |
| Atlas Network Access + DB user least privilege | Separate read-only users for scripts if needed |
| Compression | Optional (`compressors`) if RTT to Atlas is high; measure first |

### Env reference

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=HashEnv
MONGODB_DB_NAME=hashenv
```

You may still put `/hashenv` in the URI path; `MONGODB_DB_NAME` remains the reliable override.

**Migration note:** If you already wrote data into Atlas database `test`, either set `MONGODB_DB_NAME=test` temporarily or move collections to `hashenv` in Atlas (or export/import), then point the app at `hashenv`.

---

## 2. Schema design audit (`/mongodb-schema-design`)

### Collection map (19)

| Collection | Role | Embed vs reference |
|------------|------|--------------------|
| `users` | Identity | Standalone |
| `usersettings` | 1:1 user prefs | Separate OK (independent reads; panic/auto-flush) |
| `organizations` | Tenant | Standalone |
| `orgmembers` | Org membership | Referenced (M:N user↔org) — correct |
| `organizationsettings` | 1:1 org prefs | Separate OK |
| `orginvites` / `projectinvites` | Invites | Separate — correct (lifecycle, TTL-ish expiry) |
| `projects` | Project + **embedded members** | Embed members (1:few) — good |
| `components` | Project children | Referenced — correct (secrets hang off them) |
| `secretfiles` | Versioned encrypted blobs | Separate docs per version — correct for 16MB / growth |
| `secrets` / `associatedaccounts` | Encrypted payloads | Separate — correct |
| `projectapitokens` / `refreshtokens` | Auth tokens | Separate + hashed — correct |
| `auditlogs` | Append-only audit | Separate — correct; needs lifecycle |
| `*encryptionkeys` / `instancekeys` | Key hierarchy | Separate — correct (isolation, rotation) |

### What looks solid

- **Data accessed together stored together:** project members embedded on `projects` (loaded with project access checks).
- **Unbounded / large payloads not embedded:** secret file versions are separate documents (avoids 16MB blow-ups and document rewrite amplification).
- **Not the “one collection per category” anti-pattern:** entity collections are domain models, not artificial partitions.
- **Encryption keys isolated** from business documents (good security boundary).
- **TTL on `refreshtokens.expiresAt`** — good lifecycle pattern.
- **Unique constraints** where needed (`users.email`, `users.username`, org slug, component slug per project, secret name per component, etc.).

### Findings and recommendations

#### F1 — Audit log growth (Archive / TTL) — Medium

`auditlogs` only grows. Indexes on `organizationId+createdAt`, `projectId+createdAt`, etc. will bloat on M0 storage.

**Suggestion:** TTL or archive after N days (e.g. 90–180). Example TTL index once retention is agreed:

```js
// Only after product sign-off on retention
db.auditlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 15552000 }) // 180d
```

Or Online Archive / cold collection per Archive pattern.

#### F2 — Secret file version unbounded growth — Medium

Each upload creates a new `secretfiles` document with full encrypted payload. Correct modeling, but versions never prune.

**Suggestion:** Cap retained versions per `(componentId, environment, fileName)` (e.g. keep last 20) or offer “prune old versions” in admin tools. Monitor collection size on M0 (512 MB shared).

#### F3 — Settings as separate collections — Low (acceptable)

`usersettings` / `organizationsettings` are 1:1. Embedding into `users` / `organizations` would reduce round trips slightly. Current split is fine for independent updates and clearer panic/auto-flush queries. **No change required.**

#### F4 — No database-level `$jsonSchema` validators — Low

Mongoose validates in app. For defense in depth on Atlas, consider moderate `$jsonSchema` on high-risk collections later (`validationLevel: "moderate"`, start with `warn`).

#### F5 — Schema versioning — Info

No `schemaVersion` field. Fine while models are stable; add when rolling breaking document shape changes without downtime.

#### F6 — Extended reference opportunity — Low

Some paths load `Project` then `Organization` separately for name/slug. Occasional denormalized `organizationName` on project is optional; current volume does not justify it yet.

### Anti-pattern checklist

| Anti-pattern | Status |
|--------------|--------|
| Unnecessary collections (partition-by-day style) | Avoided |
| Excessive `$lookup` | Avoided (app-level multi-query / populate; no heavy pipelines with lookups) |
| Unnecessary overlapping indexes | Partial — see query section |
| Unbounded arrays in hot documents | Avoided for secrets; watch `projects.members` if orgs get huge |

---

## 3. Query / index audit (`/mongodb-query-optimizer`)

MongoDB MCP / Atlas Performance Advisor were **not** available. Suggestions below are from static review of filters, sorts, and declared indexes. Treat as proposals; confirm with `explain("executionStats")` before creating indexes in production.

### Index coverage that looks good

| Collection | Query pattern | Supporting index |
|------------|---------------|------------------|
| `projects` | by `organizationId`, `createdBy`, `members.userId` | Present |
| `orgmembers` | `(organizationId, userId)` unique; by `userId` | Present |
| `components` | `(projectId, slug)` unique | Present |
| `secrets` | `(componentId, name)` unique; by `projectId` | Present |
| `secretfiles` | `(componentId, environment, fileName, version)` unique | Present |
| `associatedaccounts` | `(projectId, label)` unique | Present |
| `projectapitokens` | `tokenHash` unique; list by project | Present |
| `refreshtokens` | `tokenHash` unique; TTL | Present |
| `auditlogs` | org/project/actor + `createdAt` | Present |

### High-impact gaps

#### Q1 — Auth token lookups on `users` — High

Routes look up by `emailVerificationToken` / `passwordResetToken` (with expiry). Those fields are `select: false` and **have no indexes** → collection scan as user count grows.

**Suggestion:**

```js
db.users.createIndex({ emailVerificationToken: 1 }, { sparse: true })
db.users.createIndex({ passwordResetToken: 1 }, { sparse: true })
```

(Or partial indexes where token exists.)

#### Q2 — Auto-flush scan on `usersettings` — Medium

`UserSettings.find({ flushDuration: { $ne: null, $gte: 1 } })` hourly. Without an index, full scan of settings.

**Suggestion:**

```js
db.usersettings.createIndex(
  { flushDuration: 1 },
  { partialFilterExpression: { flushDuration: { $gte: 1 } } }
)
```

#### Q3 — Redundant indexes — Low (write overhead)

| Collection | Issue |
|------------|-------|
| `associatedaccounts` | `{ projectId: 1, label: 1 }` unique **and** `{ projectId: 1 }` — prefix of compound covers `projectId`-only queries; drop singleton if Atlas advises |
| `secretfiles` | Unique `{ componentId, environment, fileName, version: 1 }` **and** non-unique same fields with `version: -1` — overlapping; prefer one compound that matches sort (`version: -1`) plus uniqueness strategy |
| `components` | `projectId: index: true` plus `{ projectId, slug }` unique — singleton often redundant |
| `auditlogs` | Standalone `{ createdAt: -1 }` may be redundant if every query also filters org/project/actor |

Drop only after confirming with Performance Advisor `dropIndexSuggestions` or `explain`.

#### Q4 — SecretFile aggregations — Medium (shape OK, index path)

`SecretFile.aggregate` patterns:

1. `$match: { projectId }` → `$sort: { version: -1 }` → `$group` by environment  
2. `$match: { projectId, componentId }` → `$sort: { version: -1 }` → `$group` by env+fileName  

`projectId` is indexed (field + compound elsewhere). For (2), a compound like `{ projectId: 1, componentId: 1, version: -1 }` can reduce in-memory sort cost as versions grow. Current `{ componentId, environment, fileName, version }` helps latest-by-file lookups well.

#### Q5 — N+1 / multi-round-trip patterns — Medium (code, not index)

| Location | Pattern | Suggestion |
|----------|---------|------------|
| `dataTransfer.ts` | Per-component `SecretFile.find` / `Secret.find` | Prefer `$in: componentIds` once, group in memory |
| `autoFlush.ts` | `find` all files then `deleteMany` | `deleteMany` alone + `deletedCount` (skip load unless audit needs count of docs) |
| `authorization` / `abac` | Repeated `OrgMember` / `Project` loads per request | Request-scoped cache already partially via middleware; avoid duplicate finds in same handler |
| `component-crypto.ts` | Component → Project chain | Acceptable; rare path |

#### Q6 — Large audit list caps — OK

Routes use `.limit(1000)` on audit queries — good guard for M0.

### ESR reminder for future indexes

Equality → Sort → Range. Example for “latest secret file”:

```text
filter: { componentId, environment, fileName }
sort: { version: -1 }
→ index { componentId: 1, environment: 1, fileName: 1, version: -1 }
```

You already approximate this; keep uniqueness constraints aligned with that key.

---

## 4. Priority action list

| Priority | Action | Type |
|----------|--------|------|
| Done | `MONGODB_DB_NAME` + `dbName` connect option | Connection |
| Done | Conservative pool / idle timeouts for Atlas free | Connection |
| Done | Graceful Mongo disconnect on SIGINT/SIGTERM | Connection |
| P0 | Confirm live data is under intended DB (migrate off `test` if needed) | Ops |
| P1 | Sparse indexes on user verification / reset tokens | Index |
| P1 | Partial index for auto-flush `flushDuration` | Index |
| P2 | Audit log retention (TTL or archive) | Schema lifecycle |
| P2 | Secret file version retention policy | Schema lifecycle |
| P3 | Deduplicate redundant indexes after Advisor review | Index hygiene |
| P3 | Batch queries in `dataTransfer` / auto-flush | Query code |

---

## 5. How to re-verify with tools

When MongoDB MCP or Atlas API is configured:

1. `collection-indexes` per hot collection  
2. `explain` with `executionStats` on auth token find, secret file latest find, and env list aggregate  
3. `atlas-get-performance-advisor` with `slowQueryLogs`, `suggestedIndexes`, `dropIndexSuggestions`, `schemaSuggestions`

Do **not** create or drop indexes in production without explicit approval.

---

## Related files

- Connection: `backend/src/index.ts`
- Wipe script: `backend/scripts/wipe-database.ts`
- Env samples: `backend/env.example`, `docs/SETUP-AND-USAGE.md`, `docs/DOKPLOY-DEPLOY.md`
