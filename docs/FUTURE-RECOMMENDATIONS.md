# HashEnv Future Recommendations

Deferred improvements identified during the June 2026 gap analysis. Items **1–4 and 6** from the priority matrix were implemented; this document tracks what remains.

---

## P0 — Security and trust

### MFA / TOTP + session management

- TOTP enrollment, backup codes, optional org-wide MFA enforcement
- Session list UI (device, IP, last active) with per-session and “revoke all” actions
- Step-up auth before revealing associated-account credentials (beyond panic password re-auth)

### Granular API token scopes

- Split `read` / `write` into `env:read`, `env:write`, `secrets:read`, `secrets:write`
- Optional per-environment restrictions and IP allowlists

### Distributed rate limiting

- Replace in-memory API token rate limit (`apiTokenAuth.ts`) with Redis or DB-backed limits for multi-instance deployments
- Apply `express-rate-limit` (or equivalent) to `/api/v1` routes

### Audit hardening

- Fail loudly or alert when audit writes fail (currently swallowed)
- Retention policy, pagination, and archival for large audit volumes
- Failed login audit for unknown emails (requires system actor or optional `actorId`)

---

## P1 — Developer experience

### GitHub Actions CI

- Run `npm test` on backend (and frontend lint/typecheck) on every PR
- Integration tests with supertest: auth, `/api/v1` token flows, rollback, delete cascade, panic

### Environment promotion

- “Copy `dev` → `staging`” with diff preview before promote
- Bulk import across environments

### Cross-resource search

- Project-scoped search by key name (never values) across env versions, secrets, and accounts

### Official GitHub Action

- `hashenv/action@v1` for CI pipelines (fetch env → inject into deploy step)

---

## P1 — Team and lifecycle

### Org ownership transfer

- Promote another member to owner; demote or remove previous owner safely

### Org and account deletion

- Self-service account deletion with data export (GDPR)
- Org teardown with cascade confirmation

### Email change

- Verified email change flow in settings (not only forgot-password)

### Permission presets

- Role templates: Viewer, Deployer, Admin — map to existing ABAC permissions

---

## P2 — Enterprise / operations

### Key rotation UI

- Guided admin workflow for root key rotation (see `ROOT-KEY-ROTATION.md`)

### External KMS

- AWS KMS / GCP KMS integration for wrapping instance and project DEKs

### Audit webhooks and alerts

- Slack, email, or generic webhooks for panic, new members, token creation, failed logins

### Published threat model

- `docs/THREAT-MODEL.md` with in-scope / out-of-scope clarity for customers

### Production hardening

- Secrets manager for `ROOT_ENCRYPTION_KEY` / `JWT_SECRET` (not plain `.env` on host)
- Dependency scanning (Dependabot / npm audit in CI)
- Annual penetration test before enterprise sales

---

## P2 — Product scope (defer until demand)

| Item | Reason |
|------|--------|
| Client-side zero-knowledge E2EE | Hurts CI/API UX; industry moved away |
| Dynamic secrets / PKI | Vault / Infisical territory |
| SSO / SAML | High effort; wait for paying team customers |
| Env inheritance between environments | Promotion/copy covers most cases |
| FIPS 140-3 mode | Enterprise-only |

---

## Implemented (June 2026)

For reference, these items from the same analysis are **done**:

1. **Org audit completeness** — `organizationId` auto-resolved from `projectId` on all audits; org audit query includes project-scoped logs
2. **Auto-flush cron** — hourly job with `lastFlushAt` tracking on `UserSettings`
3. **Password reset session revocation** — all `RefreshToken` rows deleted on reset
4. **Expanded panic** — org owner/admin project scope; flush secrets/accounts and revoke API tokens; server-side password required
6. **CLI + `/api/v1` secret write** — `cli/` package (`pull`, `run`, `secret`, `env put`); POST/PUT/DELETE secrets on public API

---

## Suggested next sprint (after this batch)

1. GitHub Actions CI + integration tests
2. MFA + session list
3. Env promotion (`dev` → `staging`)
4. Audit webhooks for panic and member events
