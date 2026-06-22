# HashEnv Improvements — Permissions & Authorization

**Document purpose:** Track known flaws and gaps in the ABAC / membership / revocation model identified during a June 2026 permissions audit.

**Last updated:** June 2026  
**Status:** Open — not yet implemented

---

## Executive summary

The permissions system **blocks self-escalation** well: grants are checked against the granter’s effective permissions, JWT carries identity only, and most routes re-check membership on every request.

The main problems are **privilege persistence after revocation** (especially API tokens), **stale membership records**, and a few **over-broad read endpoints**. Org admin/owner implicit full project access is intentional but has a large blast radius.

---

## What works (no change needed)

| Area | Behavior |
|------|----------|
| JWT | Identity only (`userId`, `email`). Tampering does not grant permissions. |
| Request-time authZ | `authorization.ts` / `abac.ts` reload org + project state from DB per request. |
| Grant chains | `canGrantOrgPermissions` / `canGrantProjectPermissions` — cannot grant permissions the actor does not hold. |
| Invite accept | Requires login, matching email, verified email; project invites require org membership. |
| Permission sanitization | Unknown strings stripped by `sanitizeOrgPermissions` / `sanitizeProjectPermissions`. |
| Owner protection | Project owner access cannot be changed via PATCH; delete requires owner even with `write`. |

Users **cannot** auto-grant org admin, project write, or panic without an invite or a manager action.

---

## P0 — Security fixes

### 1. API tokens survive user/project/org revocation

**Severity:** High  
**Files:** `backend/src/lib/apiTokenAuth.ts`, `backend/src/models/ProjectApiToken.ts`

`authenticateApiToken` validates token hash, expiry, and project existence. It does **not** check whether:

- the token creator is still an org member
- the creator still has project access
- the creator still holds `project:manage_tokens`

**Impact:** User removed from project or organization can keep using issued tokens until the token is deleted, expires, or panic `revokeApiTokens` runs.

**Recommended fix:**

- On each API token request, verify creator still has appropriate project access (or org elevation), **or**
- On member removal (org or project), delete or disable tokens created by that user for affected projects, **or**
- Store token status (`active` / `revoked`) and revoke on access removal events.

---

## P1 — Authorization hygiene

### 2. Stale `project.members` after org removal

**Severity:** Medium  
**Files:** `backend/src/routes/organizations.ts` (DELETE member), `backend/src/routes/projects.ts` (GET list)

Removing an org member deletes `OrgMember` only. Rows in `project.members` may remain.

- Project detail / env / secret APIs → **blocked** (`loadProjectContext` requires org membership).
- `GET /api/projects?orgId=<orgId>` → may still **list** projects where the user appears in `members[]` even when they are no longer an org member.

**Impact:** Metadata leak (project names, structure). Not full secret access.

**Recommended fix:**

- Cascade: on org member remove, strip that `userId` from all `project.members` in the org.
- When `orgId` query param is passed, require current org membership before returning results.

### 3. Project read access can list API tokens

**Severity:** Medium–Low  
**Files:** `backend/src/routes/apiTokens.ts`

`GET /api/projects/:projectId/tokens` uses `requireProjectAccess('read')`, not `project:manage_tokens`.

**Impact:** Any read collaborator sees token names, prefixes, scopes, creators. Full secret is not returned, but exposure is broader than necessary.

**Recommended fix:** Require `project:manage_tokens` for list/create/update/delete token routes (list included).

### 4. Frontend permission cache can be stale

**Severity:** Low (UX, not auth bypass)  
**Files:** `frontend/contexts/OrganizationContext.tsx`, page-level permission fetches

Org `role` / `permissions` are cached until `refreshOrganizations()` or navigation refetch. UI may show actions after revocation; API returns 403.

**Recommended fix:** Refresh org context after member/permission mutations; optional 403 interceptor to trigger refresh.

---

## P2 — Design notes (intentional, document or tighten)

### 5. Org owner/admin implicit full project access

**Severity:** By design — large blast radius  
**Files:** `backend/src/lib/abac.ts` (`getProjectMemberAttributes`, `isOrgElevated`)

Org `owner` / `admin` receive full project capabilities on **all** org projects without being in `project.members`.

**Impact:** Compromised admin account = full read/write/export across the org. Panic eligibility includes all org projects for elevated roles (`panicProjects.ts`).

**Recommendation:** Document in threat model; consider optional “project-scoped admin” mode for enterprise.

### 6. Org admin can invite other admins

**Severity:** By design  
**Files:** `backend/src/lib/abac.ts` (`canGrantOrgRole`)

Admins may invite peers as `admin`. Spreads admin access; not self-escalation unless the actor is already admin.

**Recommendation:** Optional owner-only admin promotion policy.

### 7. `org:manage_members` on plain `member` role is ineffective

**Severity:** Quirk (too strict, not exploitable)  
**Files:** `backend/src/lib/abac.ts` (`canManageOrgMember`)

`canManageOrgMember` requires actor rank **strictly above** target. A `member` with custom `org:manage_members` cannot manage anyone (rank 1 vs 1).

**Recommendation:** Either allow manage when holding `org:manage_members` regardless of rank (with grant limits), or hide/disable this permission for `member` role in UI.

### 8. Read access allows full project export

**Severity:** By design  
**Files:** `backend/src/routes/projects.ts` (GET export), `backend/src/routes/organizations.ts` (GET export)

`requireProjectAccess('read')` is enough to export env files, secrets, and accounts as JSON.

**Recommendation:** Document; optional `project:export` capability if customers want narrower read.

### 9. Invite preview is unauthenticated

**Severity:** Low  
**Files:** `backend/src/routes/invites.ts`, `backend/src/lib/orgInvite.ts`

`GET /api/invites/preview?token=...` exposes invited email, org/project name, role, and permissions if the token leaks. Accept still requires auth + email match.

**Recommendation:** Rate-limit preview; shorten token lifetime; avoid returning permission detail in preview if not needed.

### 10. Org member enumeration

**Severity:** Low (privacy)  
**Files:** `backend/src/routes/organizations.ts` (GET members), `backend/src/routes/projects.ts` (users/search)

Any org member can list all members (with emails) and search org users.

**Recommendation:** Restrict to `org:manage_members` or `org:invite` if customers require it.

---

## Suggested implementation order

1. **API token revocation on access removal** + optional live membership check in `authenticateApiToken`
2. **Cascade project member cleanup** on org member delete
3. **`GET /projects` orgId guard** — require org membership when filtering by org
4. **Token list** → `project:manage_tokens`
5. Frontend permission refresh on 403 / after member edits
6. Threat model updates for admin blast radius and export scope

---

## Related docs

| Document | Topic |
|----------|--------|
| [FUTURE-RECOMMENDATIONS.md](./FUTURE-RECOMMENDATIONS.md) | Broader product roadmap |
| [SECURITY-IMPROVEMENTS.md](./SECURITY-IMPROVEMENTS.md) | Crypto, sessions, audit vs Infisical |
| [SECURITY-IMPLEMENTATION-PLAN.md](./SECURITY-IMPLEMENTATION-PLAN.md) | Security implementation tracking |

---

## Code references

| File | Responsibility |
|------|----------------|
| `backend/src/lib/authorization.ts` | Org/project middleware, `loadProjectContext` |
| `backend/src/lib/abac.ts` | Grant checks, effective permissions, org elevation |
| `backend/src/lib/permissions.ts` | Permission catalog, sanitization, role defaults |
| `backend/src/lib/apiTokenAuth.ts` | API token authentication |
| `backend/src/routes/organizations.ts` | Org members, invites, panic, export/import |
| `backend/src/routes/projects.ts` | Project members, list, export, tokens |
| `frontend/contexts/OrganizationContext.tsx` | Cached org role/permissions |
