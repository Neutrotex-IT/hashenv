# HashEnv PR Roadmap

Prioritized, review-sized pull requests to close feature and UX gaps identified in codebase analysis (June 2026).

Each PR is scoped for a single reviewer pass (~200–600 LOC). Dependencies are noted. **Backend (new)** means API work does not exist yet.

---

## Implementation status

| Range | Status | Notes |
|-------|--------|-------|
| **PR 1–16** | ✅ Done | Original roadmap shipped (June 2026) |
| **PR 17–26** | ✅ Done | Post-roadmap fixes, polish, and quality (June 2026) |

---

## Merge order (recommended)

### Original roadmap (complete)

```
P0  → PR 1–4     Wire existing backend APIs          ✅
P1  → PR 5–6     UX safety + feedback primitives     ✅
P2  → PR 7–9     Navigation + permission clarity       ✅
P3  → PR 10–11   Member lifecycle                    ✅
P4  → PR 12–16   Env workflow + custom env names     ✅
P5  → PR 15–16   Project lifecycle + activity feed   ✅
```

### Post-roadmap (recommended next)

```
P6  → PR 17–20   Bugs and API fixes (highest priority)
P7  → PR 21–25   UX polish and feature completion
P8  → PR 26      Quality and operations
```

---

## P0 — Wire existing backend (no new routes)

### PR 1: Organization audit logs page

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): add organization audit logs page` |
| **Why** | `GET /api/organizations/:orgId/audit` exists; docs mention org audit but there is no UI. |
| **Endpoints** | `GET /api/organizations/:orgId/audit` |
| **Add** | `frontend/app/organizations/[orgId]/audit/page.tsx` |
| **Modify** | `frontend/lib/api.ts` — `organizationsAPI.getAudit(orgId)` |
| | `frontend/app/organizations/[orgId]/members/page.tsx` — link to audit (if user has `org:audit`) |
| | `frontend/app/dashboard/page.tsx` or org header — entry link for team orgs |
| **Acceptance** | Table of logs (time, actor, action, resource, metadata). 403 shows permission message. Paginate or cap at 1000 with note. |
| **Size** | S |

---

### PR 2: Organization settings (rename)

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): organization rename settings page` |
| **Why** | `organizationsAPI.update` exists but is unused. |
| **Endpoints** | `GET /api/organizations/:orgId`, `PATCH /api/organizations/:orgId` (`{ name }`) |
| **Add** | `frontend/app/organizations/[orgId]/settings/page.tsx` |
| **Modify** | Org members page — subnav: Members · Settings · Audit |
| | `frontend/contexts/OrganizationContext.tsx` — refresh org list after rename |
| **Acceptance** | Owner/admin with `org:update` can rename. Validation errors inline. |
| **Size** | S |

---

### PR 3: Edit organization member role and ABAC permissions

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): edit org member role and permissions` |
| **Why** | Invite flow uses `OrgPermissionPicker`; existing members are view-only + remove. |
| **Endpoints** | `GET /api/organizations/:orgId/permissions`, `PATCH /api/organizations/:orgId/members/:memberId` |
| **Modify** | `frontend/app/organizations/[orgId]/members/page.tsx` |
| **Add** | `frontend/components/ui/EditOrgMemberModal.tsx` (optional) |
| **Acceptance** | Edit non-owner members: role (`member` \| `admin`) + optional `permissions[]` for members. Uses existing `organizationsAPI.updateMember`. |
| **Size** | S–M |

---

### PR 4: Edit API token name and scopes

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): edit API token name and scopes` |
| **Why** | `apiTokensAPI.update` exists; tokens page only creates and revokes. |
| **Endpoints** | `PATCH /api/projects/:projectId/tokens/:tokenId` (`{ name?, scopes? }`) |
| **Modify** | `frontend/app/projects/[id]/tokens/page.tsx` |
| **Add** | `frontend/components/ui/EditApiTokenModal.tsx` (optional) |
| **Acceptance** | Inline or modal edit. Show `lastUsedAt`, `expiresAt`, `tokenPrefix`. Token secret never re-shown. |
| **Size** | S |

---

## P1 — UX safety (frontend only)

### PR 5: Sensitive value viewer modal

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): modal viewer for secrets and account credentials` |
| **Why** | Project page uses `alert()` for secrets and associated accounts — poor UX and no copy/mask controls. |
| **Endpoints** | `GET /api/projects/:projectId/secrets/:secretId/content`, `GET /api/projects/:projectId/accounts/:accountId/credentials` |
| **Add** | `frontend/components/ui/SensitiveValueModal.tsx` — masked fields, reveal toggle, per-field copy |
| **Modify** | `frontend/app/projects/[id]/page.tsx` — replace `handleViewSecret`, `handleViewAccount` |
| **Acceptance** | No `alert()` for view actions on project page. Password fields masked by default. |
| **Size** | M |

---

### PR 6: Confirm dialog and toast system

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): shared confirm dialog and toast notifications` |
| **Why** | `alert()` / `confirm()` used across 8+ files. |
| **Endpoints** | None |
| **Add** | `frontend/components/ui/ConfirmDialog.tsx`, `frontend/components/ui/Toast.tsx`, `frontend/contexts/ToastContext.tsx` |
| **Modify** | Migrate in this PR: `projects/[id]/page.tsx` (delete secret/env), `dashboard/page.tsx` (panic), `projects/[id]/tokens/page.tsx` |
| **Follow-up** | Remaining pages — see **PR 21** (was PR 6b) |
| **Acceptance** | Destructive actions use styled confirm. Success/error use toasts, not `alert()`. |
| **Size** | M |

---

## P2 — Navigation and clarity

### PR 7: Organization admin hub and navigation

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): organization admin subnav and sidebar links` |
| **Why** | Org features are hard to discover; sidebar has no org section. |
| **Endpoints** | None |
| **Add** | `frontend/app/organizations/[orgId]/layout.tsx` — subnav: Members · Settings · Audit |
| **Modify** | `frontend/components/Sidebar.tsx`, `frontend/components/OrgSwitcher.tsx` |
| **Acceptance** | Team org selected → clear path to members/settings/audit. |
| **Size** | S |
| **Depends on** | PR 1–2 (pages exist) |

---

### PR 8: Effective permissions panel

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): show effective ABAC permissions to users` |
| **Why** | Users only see read/write; ABAC catalog exists on backend. |
| **Endpoints** | `GET /api/organizations/:orgId/permissions`, `GET /api/projects/:id/permissions` |
| **Modify** | `frontend/app/projects/[id]/page.tsx`, `frontend/app/organizations/[orgId]/members/page.tsx` |
| **Add** | `frontend/components/ui/EffectivePermissionsPanel.tsx` (optional) |
| **Acceptance** | Collapsible panel lists `effective` and explains missing actions (e.g. cannot manage tokens). |
| **Size** | S |

---

### PR 9: Expand API token usage documentation in UI

| Field | Detail |
|-------|--------|
| **Title** | `docs(frontend): complete /api/v1 usage examples on tokens page` |
| **Why** | Only download/upload curl shown; list env, list/get secrets undocumented in UI. |
| **Endpoints** | Document only: |
| | `GET /api/v1/projects/:id/env` |
| | `GET /api/v1/projects/:id/env/list` |
| | `PUT /api/v1/projects/:id/env` |
| | `GET /api/v1/projects/:id/secrets` |
| | `GET /api/v1/projects/:id/secrets/:name` |
| **Modify** | `frontend/app/projects/[id]/tokens/page.tsx` |
| **Acceptance** | Accordion or tabs per endpoint with copy-ready curl. Note 100 req/min rate limit. |
| **Size** | S |

---

## P3 — Access lifecycle (backend required)

### PR 10a: Update project member (backend)

| Field | Detail |
|-------|--------|
| **Title** | `feat(backend): PATCH project member permission and capabilities` |
| **Why** | Can add members with `permissions[]`; cannot update after add. No PATCH route. |
| **Endpoints (new)** | `PATCH /api/projects/:id/members/:userId` — body: `{ permission?: 'read' \| 'write', permissions?: string[] }` |
| **Modify** | `backend/src/routes/projects.ts` — mirror grant checks from `POST .../members` |
| **Acceptance** | ABAC enforced. Owner/org-elevated bypass unchanged. Audit log entry. |
| **Size** | M |

---

### PR 10b: Update project member (frontend)

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): edit project member access and capabilities` |
| **Endpoints** | `PATCH /api/projects/:id/members/:userId` |
| **Modify** | `frontend/lib/api.ts` — `projectsAPI.updateMember` |
| | `frontend/app/projects/[id]/members/page.tsx` — Edit modal + `ProjectPermissionPicker` |
| **Depends on** | PR 10a |
| **Size** | S–M |

---

### PR 11a: Resend invite (backend)

| Field | Detail |
|-------|--------|
| **Title** | `feat(backend): resend organization and project invites` |
| **Endpoints (new)** | `POST /api/organizations/:orgId/invites/:inviteId/resend` |
| | `POST /api/projects/:id/invites/:inviteId/resend` |
| **Modify** | Reuse `createAndSendOrgInvite` / `createAndSendProjectInvite` email helpers |
| **Acceptance** | Only `pending` non-expired invites. Same permission as original invite. |
| **Size** | M |

---

### PR 11b: Resend invite (frontend)

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): resend invite buttons` |
| **Modify** | `frontend/app/organizations/[orgId]/members/page.tsx`, `frontend/app/projects/[id]/members/page.tsx` |
| | `frontend/lib/api.ts` — `resendInvite` methods |
| **Depends on** | PR 11a |
| **Size** | S |

---

## P4 — Environment workflow

### PR 12: Env version diff (MVP) ✅

| Field | Detail |
|-------|--------|
| **Title** | `feat: compare two env file versions` |
| **Status** | ✅ **Option A shipped** — `EnvCompareModal` (client-side diff) |
| **Option A (smaller)** | Client-side: fetch two `GET .../env/:envFileId/content`, diff in browser |
| **Option B (better)** | **Backend (new):** `GET /api/projects/:projectId/env/diff?environment=&from=&to=` → `{ added, removed, changed }` — see **PR 22** |
| **Add** | `frontend/components/ui/EnvCompareModal.tsx` |
| **Modify** | `frontend/app/projects/[id]/page.tsx` — Compare on toolbar and version rows |
| **Acceptance** | Side-by-side or unified diff for key=value lines. |
| **Size** | M (client MVP) / L (server diff) |

---

### PR 13: Env rollback ✅

| Field | Detail |
|-------|--------|
| **Title** | `feat: rollback env to previous version` |
| **Endpoints (new)** | `POST /api/projects/:projectId/env/rollback` — `{ environment, version }` → creates new version from old content |
| **Modify** | `backend/src/routes/env.ts`, `frontend/app/projects/[id]/page.tsx` |
| **Acceptance** | Rollback = new version N+1, not in-place edit. Audited as `rollback`. |
| **Size** | M |

---

## P4 — Custom environment names ✅

> **Shipped.** Projects now store `environments: string[]` (default `dev` / `staging` / `prod`). Slugs are validated per project.

Previously environments were hardcoded to `dev`, `staging`, `prod` in:

| Layer | Location |
|-------|----------|
| Model | `backend/src/models/EnvFile.ts` — `enum: ['dev', 'staging', 'prod']` |
| Validation | `backend/src/middleware/validation.ts` — `validateEnvironment`, `validateEnvironmentQuery` |
| API | `backend/src/routes/env.ts`, `backend/src/routes/api.ts` (`/api/v1`) |
| Frontend | `projects/[id]/page.tsx`, `env/upload`, `env/edit`, `logs/page.tsx`, `ProjectCard.tsx`, `UploadEnvButton.tsx` |

**Design:** Store allowed environment slugs on the project. Env files reference a slug string validated against that list. Default projects keep `['dev', 'staging', 'prod']` for backward compatibility.

**Env slug rules:**

- Pattern: `^[a-z][a-z0-9-]{1,31}$` (2–32 chars, lowercase, starts with letter)
- Max environments per project: **20**
- Reserved slugs blocked: `all`, `default`, `latest` (avoid query ambiguity)
- Rename updates `EnvFile.environment` for all versions of that slug (transaction or bulk update)
- Delete blocked if env files exist unless `?force=true` (deletes all versions — destructive, confirm in UI)

---

### PR 14a: Custom environments — backend model and validation

| Field | Detail |
|-------|--------|
| **Title** | `feat(backend): project-scoped custom environment names` |
| **Endpoints** | None new yet; schema + validation foundation |
| **Modify** | `backend/src/models/Project.ts` — add `environments: string[]` default `['dev','staging','prod']` |
| | `backend/src/models/EnvFile.ts` — remove enum; `environment: String` indexed |
| | `backend/src/middleware/validation.ts` — replace `isIn([...])` with `validateEnvironmentSlug()` + async check against project |
| | `backend/src/routes/env.ts` — resolve project environments on upload/download/list |
| | `backend/src/routes/api.ts` — same validation for `/api/v1` |
| **Add** | `backend/src/lib/environments.ts` — `normalizeEnvSlug`, `isValidEnvSlug`, `assertEnvAllowed(project, slug)` |
| **Migration** | One-time script or startup hook: projects missing `environments` → set default triple |
| **Acceptance** | Existing data works unchanged. Upload to `dev`/`staging`/`prod` still works. Invalid slug → 400. |
| **Size** | M–L |

---

### PR 14b: Custom environments — CRUD API

| Field | Detail |
|-------|--------|
| **Title** | `feat(backend): CRUD API for project environments` |
| **Endpoints (new)** | |
| | `GET /api/projects/:id/environments` — list slugs + metadata (hasFiles, latestVersion, updatedAt) |
| | `POST /api/projects/:id/environments` — `{ name: string }` add slug (requires project write) |
| | `PATCH /api/projects/:id/environments/:slug` — `{ name: string }` rename (requires write) |
| | `DELETE /api/projects/:id/environments/:slug` — remove slug; optional `?force=true` deletes all env files |
| **Modify** | `backend/src/routes/projects.ts` or new `backend/src/routes/environments.ts` mounted under `/api/projects` |
| **Acceptance** | Cannot add duplicate slug. Rename updates all `EnvFile` rows. Delete without force fails if versions exist. Audited. |
| **Size** | M |

---

### PR 14c: Custom environments — frontend dynamic selectors

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): dynamic environment tabs and upload selectors` |
| **Endpoints** | `GET /api/projects/:id/environments` |
| **Modify** | `frontend/lib/api.ts` — `environmentsAPI.list(projectId)` |
| | `frontend/app/projects/[id]/page.tsx` — load env list, dynamic tabs (not hardcoded array) |
| | `frontend/app/projects/[id]/env/upload/page.tsx` — dropdown from API |
| | `frontend/app/projects/[id]/env/edit/[envFileId]/page.tsx` — display dynamic env label |
| | `frontend/app/projects/[id]/logs/page.tsx` — filter includes all project envs + "all" |
| | `frontend/components/ProjectCard.tsx` — quick download per env or overflow menu |
| | `frontend/components/ui/UploadEnvButton.tsx` — `environment?: string` |
| **Add** | `frontend/lib/environments.ts` — shared label helper (slug → display name) |
| **Acceptance** | Projects with only defaults behave as today. New custom env appears in tabs after create (PR 14d). |
| **Depends on** | PR 14a, 14b |
| **Size** | M–L |

---

### PR 14d: Custom environments — manage environments UI

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): manage project environments (add, rename, delete)` |
| **Endpoints** | `GET/POST/PATCH/DELETE /api/projects/:id/environments` |
| **Add** | `frontend/app/projects/[id]/environments/page.tsx` OR section on project settings |
| **Add** | `frontend/components/ui/ManageEnvironmentsPanel.tsx` — add form, rename inline, delete with confirm |
| **Modify** | `frontend/app/projects/[id]/page.tsx` — link "Manage environments" (write access) |
| | `frontend/lib/api.ts` — `create`, `rename`, `delete` |
| **Acceptance** | Add `qa`, `preview`, etc. Delete warns if versions exist; force delete explains data loss. |
| **Depends on** | PR 14c |
| **Size** | M |

---

### PR 14e: Custom environments — docs and API examples

| Field | Detail |
|-------|--------|
| **Title** | `docs: custom environment names in setup guide and token examples` |
| **Modify** | `docs/SETUP-AND-USAGE.md` — custom env section |
| | `frontend/app/projects/[id]/tokens/page.tsx` — curl examples use selected env slug |
| | `frontend/app/page.tsx` — marketing copy: not limited to three envs |
| **Depends on** | PR 14d |
| **Size** | S |

---

## P5 — Project lifecycle and activity

### PR 15a: Rename project (backend + frontend)

| Field | Detail |
|-------|--------|
| **Title** | `feat: rename project` |
| **Endpoints (new)** | `PATCH /api/projects/:id` — `{ name }` |
| **Add** | `frontend/app/projects/[id]/settings/page.tsx` (rename section only) |
| **Size** | S–M |

---

### PR 15b: Delete project (backend + frontend)

| Field | Detail |
|-------|--------|
| **Title** | `feat: delete project with cascade` |
| **Endpoints (new)** | `DELETE /api/projects/:id` |
| **Backend** | Cascade: env files, secrets, accounts, tokens, invites, encryption key (`deleteProjectEncryptionKey`) |
| **Frontend** | Danger zone on `projects/[id]/settings/page.tsx` — type project name to confirm |
| **Size** | L |
| **Depends on** | PR 15a (settings page exists) |

---

### PR 16: Unified project activity feed ✅

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): project activity feed` |
| **Endpoints today** | `GET /api/projects/:projectId/env/logs` |
| **Endpoints (optional later)** | `GET /api/projects/:id/activity` — aggregate audit types — see **PR 23** |
| **Add** | `frontend/app/projects/[id]/activity/page.tsx` |
| **Modify** | Link from project page (replaces owner-only “View Logs” for read access). Env-only for now. |
| **Size** | M |

---

## P6 — Bugs and API fixes (post-roadmap)

### PR 17: Fix `/api/v1` public API routes

| Field | Detail |
|-------|--------|
| **Title** | `fix(backend): repair /api/v1 token-authenticated routes` |
| **Why** | `backend/src/routes/api.ts` uses wrong model fields (`encryptedContent` / `nonce` vs `encryptedData` / `iv`) and incorrect `auditEnv` / `auditSecret` signatures. Documented token examples may not work for CI/CD. |
| **Endpoints** | `GET/PUT /api/v1/projects/:id/env`, `GET /api/v1/projects/:id/env/list`, `GET /api/v1/projects/:id/secrets`, `GET /api/v1/projects/:id/secrets/:name` |
| **Modify** | `backend/src/routes/api.ts` — align with session-auth `env.ts` / `secrets.ts` patterns |
| **Acceptance** | Curl examples on tokens page work end-to-end. Custom env slugs validated. Audit entries created with correct actor. |
| **Size** | M |
| **Priority** | **P0** — blocks real API token usage |

---

### PR 18: Env log download environment filter

| Field | Detail |
|-------|--------|
| **Title** | `fix(backend): filter log download by environment query param` |
| **Why** | `GET .../env/logs` respects `?environment=`, but `GET .../env/logs/download` always returns all env logs. Activity page download with a filter selected is misleading. |
| **Modify** | `backend/src/routes/env.ts` — mirror log list filter on download route |
| **Acceptance** | Downloaded `.txt` matches filtered table on activity page. |
| **Size** | S |

---

### PR 19: Retire duplicate logs page

| Field | Detail |
|-------|--------|
| **Title** | `chore(frontend): redirect /logs to /activity` |
| **Why** | `projects/[id]/logs/page.tsx` duplicates `activity/page.tsx`. Project page links to `/activity` only; `/logs` is orphaned. |
| **Options** | (A) Next.js redirect in `logs/page.tsx` → `/activity`; (B) delete `logs/page.tsx` and add redirect in `next.config` |
| **Acceptance** | No dead route. Bookmarks to `/logs` still work. |
| **Size** | S |

---

### PR 20: Project delete audit log cascade

| Field | Detail |
|-------|--------|
| **Title** | `fix(backend): delete audit logs when project is deleted` |
| **Why** | `DELETE /api/projects/:id` cascades env files, secrets, tokens, etc., but leaves `AuditLog` rows for the project. |
| **Modify** | `backend/src/routes/projects.ts` — `AuditLog.deleteMany({ projectId })` in delete handler |
| **Acceptance** | No orphaned project audit rows after delete. Delete audit entry for the project itself still recorded (org-scoped if applicable). |
| **Size** | S |

---

## P7 — UX polish and feature completion

### PR 21: Toast migration (PR 6b)

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): complete toast migration on remaining pages` |
| **Why** | PR 6 removed native `alert()` / `confirm()`. Several pages still use inline success/error banners instead of toasts. |
| **Modify** | `app/settings/page.tsx`, `organizations/[orgId]/settings/page.tsx`, `organizations/[orgId]/members/page.tsx`, `projects/[id]/settings/page.tsx`, auth pages (`login`, `forgot-password`, `reset-password`, `accept-invite`) |
| **Acceptance** | Success and error feedback uses `ToastContext` consistently. Inline banners removed or limited to form field errors only. |
| **Size** | S–M |
| **Depends on** | PR 6 ✅ |

---

### PR 22: Server-side env diff (PR 12 Option B)

| Field | Detail |
|-------|--------|
| **Title** | `feat(backend): env version diff endpoint` |
| **Why** | PR 12 shipped client-side compare. Server diff is better for large files, API consumers, and avoids double content fetch in browser. |
| **Endpoints (new)** | `GET /api/projects/:projectId/env/diff?environment=&from=&to=` → `{ added, removed, changed }` |
| **Modify** | Optional: `EnvCompareModal` can call server diff instead of client `envDiff.ts` |
| **Acceptance** | Same diff semantics as client MVP. Permission: read. |
| **Size** | M |
| **Depends on** | PR 12 ✅ |

---

### PR 23: Aggregate project activity feed (PR 16 extension)

| Field | Detail |
|-------|--------|
| **Title** | `feat: unified project activity across resource types` |
| **Why** | Activity page shows env audit logs only. Secrets views, token changes, member updates are not visible. |
| **Endpoints (new)** | `GET /api/projects/:id/activity` — merge `resourceType` env, secret, account, project (tokens if audited) |
| **Modify** | `frontend/app/projects/[id]/activity/page.tsx` — richer feed with action labels per resource |
| **Acceptance** | Single timeline for env + secret + member events (minimum). Filter by resource type optional. |
| **Size** | M–L |
| **Depends on** | PR 16 ✅ |

---

### PR 24: Project admin subnav and layout

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): project subnav and sidebar context links` |
| **Why** | Orgs have `layout.tsx` subnav (Members · Settings · Audit). Project features (members, tokens, settings, activity, environments) are only linked from the project detail page. |
| **Add** | `frontend/app/projects/[id]/layout.tsx` — subnav: Overview · Members · Tokens · Activity · Settings · Environments |
| **Modify** | `frontend/components/Sidebar.tsx` — contextual links when pathname is under `/projects/[id]` |
| **Acceptance** | Same discoverability pattern as org admin hub (PR 7). |
| **Size** | S–M |
| **Depends on** | PR 15–16 ✅ |

---

### PR 25: Compare UX — pre-select versions from row

| Field | Detail |
|-------|--------|
| **Title** | `feat(frontend): compare env versions from table row` |
| **Why** | Compare modal opens with default from/to versions. No “compare this version with…” action on a specific row. |
| **Modify** | `EnvCompareModal` — accept `initialFromVersion` / `initialToVersion`; version row action “Compare with latest” (or picker) |
| **Acceptance** | One click from a version row opens diff against latest (or chosen target). |
| **Size** | S |
| **Depends on** | PR 12 ✅ |

---

## P8 — Quality and operations

### PR 26: Core integration tests

| Field | Detail |
|-------|--------|
| **Title** | `test: API integration tests for critical paths` |
| **Why** | No automated tests in repo today. Regression risk as surface area grows. |
| **Add** | Test harness (e.g. Vitest + supertest or jest) for: env slug validation, rollback creates N+1, project delete cascade, `/api/v1` token auth |
| **Acceptance** | CI runs tests on PR. Covers happy path + 403/400 for at least the above. |
| **Size** | L |

---

## Gap → endpoint → page (quick reference)

| Gap | Endpoint(s) | Page / change |
|-----|-------------|---------------|
| Org audit UI | `GET /organizations/:orgId/audit` | `organizations/[orgId]/audit/page.tsx` ✅ |
| Org rename | `PATCH /organizations/:orgId` | `organizations/[orgId]/settings/page.tsx` ✅ |
| Edit org member | `PATCH /organizations/:orgId/members/:memberId` | Extend `organizations/[orgId]/members/page.tsx` ✅ |
| Edit API token | `PATCH /projects/:id/tokens/:tokenId` | Extend `projects/[id]/tokens/page.tsx` ✅ |
| Safe secret view | `GET .../secrets/:id/content` | `SensitiveValueModal` + project page ✅ |
| Toasts / confirms | — | Shared UI components ✅ |
| Edit project member | `PATCH /projects/:id/members/:userId` | Extend `projects/[id]/members/page.tsx` ✅ |
| Resend invite | resend endpoints | Org + project members pages ✅ |
| Env diff (client) | content fetch × 2 | `EnvCompareModal` ✅ |
| Env rollback | `POST .../env/rollback` | Versions table ✅ |
| Custom env names | PR 14a–e | Dynamic tabs + `environments` page ✅ |
| Project rename | `PATCH /projects/:id` | `projects/[id]/settings/page.tsx` ✅ |
| Project delete | `DELETE /projects/:id` | Settings danger zone ✅ |
| Activity feed | env logs (+ optional aggregate) | `projects/[id]/activity/page.tsx` ✅ |
| **`/api/v1` broken** | **PR 17** fix read/write env + secrets routes | `backend/src/routes/api.ts` |
| Log download filter | **PR 18** `GET .../env/logs/download?environment=` | `backend/src/routes/env.ts` |
| Orphan `/logs` page | **PR 19** redirect to `/activity` | `projects/[id]/logs/page.tsx` |
| Delete audit orphan | **PR 20** cascade `AuditLog` on project delete | `backend/src/routes/projects.ts` |
| Toast migration (6b) | — | settings, members, auth pages |
| Server env diff | **PR 22** `GET .../env/diff` | optional compare modal |
| Full activity aggregate | **PR 23** `GET .../activity` | extend activity page |
| Project subnav | — | `projects/[id]/layout.tsx` |
| Compare row UX | — | `EnvCompareModal` + version table |
| Integration tests | — | CI test suite |

---

## Explicitly deferred (not in this roadmap)

| Item | Reason |
|------|--------|
| `/api/v1` secret write | No endpoint; scope creep |
| 2FA / session list | No auth endpoints |
| Email change in settings | Only forgot-password flow exists |
| Org transfer / ownership change | No backend |
| Bulk env import across environments | Separate feature |
| Production deployment | See [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md) — env vars, JWT, encryption keys, SMTP, CORS (ops, not a code PR) |

---

## PR checklist template

Copy per PR:

```markdown
## PR N: [title]

### Summary
-

### Endpoints
-

### Files changed
- [ ]

### Test plan
- [ ] Happy path
- [ ] 403 forbidden
- [ ] Validation errors
- [ ] Regression on existing dev/staging/prod flows

### Screenshots
(if UI)
```

---

## Suggested next sprint (post-roadmap)

1. **Production deploy** — follow [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md) (secrets, CORS, SMTP, MongoDB)
2. **CI + integration tests** — GitHub Actions; supertest coverage for `/api/v1`, rollback, delete cascade
3. **TypeScript cleanup** — resolve remaining `tsc` errors in `apiTokenAuth.ts` / `apiTokens.ts`
4. **Deferred features** — only if needed: `/api/v1` secret write, org ownership transfer, 2FA

### Original post-roadmap sprint (complete)

1. ~~**PR 17–20** — API fixes, log filter, logs redirect, audit cascade~~ ✅
2. ~~**PR 21–25** — Toasts, server diff, activity feed, project subnav, compare UX~~ ✅
3. ~~**PR 26** — Unit test harness (env validation, diff)~~ ✅

### Original sprint (complete)

1. ~~**PR 1** — Org audit~~ ✅
2. ~~**PR 5** — Secret modal~~ ✅
3. ~~**PR 14a** — Custom env backend foundation~~ ✅
4. ~~**PR 3** — Org member edit~~ ✅
