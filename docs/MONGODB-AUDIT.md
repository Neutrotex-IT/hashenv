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

#### F1 — Audit log growth (Archive / TTL) — Medium — **Applied**

Daily archive job moves docs older than **90 days** into `auditlogarchives` via `$merge`, then deletes from hot `auditlogs` (MongoDB Archive Pattern). See `backend/src/lib/archiveAuditLogs.ts`.

#### F2 — Secret file version unbounded growth — Medium — **Applied**

Cap: last **20** versions per `(componentId, environment, fileName)`. Prune after upload/edit/rollback/import; startup backfill; UI notice on component version list.

#### F3 — Settings as separate collections — Low (acceptable)

`usersettings` / `organizationsettings` are 1:1. Embedding into `users` / `organizations` would reduce round trips slightly. Current split is fine for independent updates and clearer panic/auto-flush queries. **No change required** (skipped by design).

#### F4 — No database-level `$jsonSchema` validators — Low — **Applied**

`ensureCollectionValidators()` applies `$jsonSchema` with `validationLevel: "moderate"` and `validationAction: "warn"` on `users`, `secrets`, `secretfiles`, `projects`, `auditlogs`.

#### F5 — Schema versioning — Info — **Applied**

`schemaVersion: 1` (default) on high-risk models + startup backfill. Pairs with F4 validators.

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

#### Q1 — Auth token lookups on `users` — High — **Applied**

Sparse unique indexes on `emailVerificationToken` and `passwordResetToken`.

#### Q2 — Auto-flush scan on `usersettings` — Medium — **Applied**

Partial index on `flushDuration` with `{ flushDuration: { $gte: 1 } }`.

#### Q3 — Redundant indexes — Low (write overhead) — **Applied**

Dropped redundant singletons / overlapping SecretFile unique; kept `{ createdAt: -1 }` on `auditlogs` for archive age scans. `syncIndexes()` on touched models at startup.

#### Q4 — SecretFile aggregations — Medium (shape OK, index path) — **Applied**

Compound index `{ projectId: 1, componentId: 1, version: -1 }`. Unique latest-by-file index uses `version: -1`.

#### Q5 — N+1 / multi-round-trip patterns — Medium (code, not index) — **Applied**

`dataTransfer` export batches SecretFile/Secret with `$in`; `autoFlush` uses `deleteMany.deletedCount`.

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
| Done | Sparse indexes on user verification / reset tokens | Index |
| Done | Partial index for auto-flush `flushDuration` | Index |
| Done | Audit log archive after 90 days (cold collection) | Schema lifecycle |
| Done | Secret file version retention (last 20) + UI notice | Schema lifecycle |
| Done | Deduplicate redundant indexes + syncIndexes | Index hygiene |
| Done | Batch queries in `dataTransfer` / auto-flush | Query code |
| Done | `schemaVersion` + moderate/warn `$jsonSchema` on high-risk collections | Schema defense |

---

## 5. How to re-verify with tools

When MongoDB MCP or Atlas API is configured:

1. `collection-indexes` per hot collection  
2. `explain` with `executionStats` on auth token find, secret file latest find, and env list aggregate  
3. `atlas-get-performance-advisor` with `slowQueryLogs`, `suggestedIndexes`, `dropIndexSuggestions`, `schemaSuggestions`

Do **not** create or drop indexes in production without explicit approval.

---

## Related files

- Connection: `backend/src/index.ts`, `backend/src/config/mongo.ts`
- Index sync: `backend/src/config/syncIndexes.ts`
- Validators / schemaVersion: `backend/src/config/collectionValidators.ts`
- Audit archive: `backend/src/lib/archiveAuditLogs.ts`, `backend/src/models/AuditLogArchive.ts`
- Version cap: `backend/src/lib/secretFiles.ts` (`SECRET_FILE_MAX_VERSIONS`, prune helpers)
- Wipe script: `backend/scripts/wipe-database.ts`
- Env samples: `backend/env.example`, `docs/SETUP-AND-USAGE.md`, `docs/DOKPLOY-DEPLOY.md`
