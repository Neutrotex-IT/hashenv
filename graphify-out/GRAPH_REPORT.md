# Graph Report - hashenv  (2026-08-21)

## Corpus Check
- 185 files · ~92,574 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1040 nodes · 2707 edges · 57 communities (51 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a33fca00`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 56|Community 56]]

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 37 edges
2. `Button()` - 31 edges
3. `useOrganization()` - 31 edges
4. `useAuth()` - 27 edges
5. `useProject()` - 18 edges
6. `useConfirm()` - 17 edges
7. `canWriteProject()` - 16 edges
8. `compilerOptions` - 16 edges
9. `getTestApp()` - 15 edges
10. `audit()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `cmdPull()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdRun()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdSecretSet()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdSecretsPut()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `OrganizationMembersPage()` --calls--> `useOrganization()`  [INFERRED]
  frontend/app/organizations/[orgId]/members/page.tsx → frontend/contexts/OrganizationContext.tsx

## Import Cycles
- None detected.

## Communities (57 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (25): AuthRequestWithOrg, requireComponentAccess(), applyMemberScopeFields(), canGrantResourceScope(), filterIdsByScope(), memberScopeFieldsFromGrant(), parseRestrictedResourceScope(), removeResourceFromMemberScopes() (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (15): CodeEditor(), CodeEditorProps, Navbar(), ConfirmContext, ConfirmContextType, ConfirmOptions, ConfirmProvider(), Button() (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (16): sanitizeMongoQuery(), sanitizeString(), validateComponentId(), validateEnvironment(), validateEnvironmentQuery(), validateFileContent(), validateProjectId(), validateSecretFileDescription() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (33): AuthenticatedLayout(), AuthenticatedLayoutProps, CreateOrganizationModal(), CreateOrganizationModalProps, OrgSwitcher(), ProtectedRoute(), PaneLink(), RAIL_ICONS (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (21): getOrgMemberAttributes(), isProjectOwner(), loadComponentContext(), loadOrganizationContext(), loadProjectContext(), Permission, requireAccountAccess(), requireOrgAdmin() (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (23): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit, express-validator (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (33): dependencies, axios, next, react, react-dom, tailwindcss, @tanstack/react-query, @types/node (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (21): apiRequest(), cmdPull(), cmdRun(), cmdSecretGet(), cmdSecretSet(), cmdSecretsPut(), componentBase(), getConfig() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (17): authAPI, fetchAndDownloadBlob(), ApiErrorBody, assertBlobDownloadResponse(), extractApiErrorMessage(), extractValidationMessages(), getApiErrorMessage(), getApiErrorMessageSync() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (22): buildOrganizationExport(), buildProjectExport(), countExportableItems(), countExportedProjectItems(), emptySummary(), encryptAccountCredentials(), ExportedAccount, ExportedComponent (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (11): OrganizationAuditPage(), OrgPageHeader(), OrgPageHeaderProps, AuditLogEntry, organizationsAPI, PanicButtonSettings, shallowRecordEqual(), describeEnabledActions() (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (43): ComponentDetailPage(), ProjectCard(), ProjectCardProps, ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, getEffectiveOrgPermissions(), ORG_PERMISSIONS, OrgPermission (+35 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.24
Nodes (21): connectMongo(), disconnectMongo(), getMongoConnectOptions(), getMongoDbName(), shouldUseMongoTls(), bootstrapEncryption(), resetEncryptionStatusForTests(), clearKeyCache() (+13 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (19): ApiTokenRequest, authenticateApiToken(), checkRateLimit(), getRateLimitInfo(), rateLimitMap, requireApiScope(), requireApiTokenProject(), revokeApiTokensForUser() (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (11): comparePassword(), authRateLimiter, formatValidationErrors(), validateEmail(), validatePassword(), generateRefreshToken(), hashRefreshToken(), IRefreshToken (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (13): canManageOrgMember(), canPerformOrgAction(), getOrganizationPanicSettings(), getOrganizationSettingsPayload(), upsertOrganizationPanicSettings(), DEFAULT_PANIC_BUTTON_SETTINGS, mergePanicButtonSettings(), PanicButtonSettings (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (11): deleteComponentEncryptionKey(), deleteComponentCascade(), deleteProjectComponents(), isValidComponentSlug(), normalizeComponentSlug(), RESERVED_COMPONENT_SLUGS, slugFromComponentName(), ensureComponent() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (10): authenticate(), AuthRequest, generateAccessToken(), generateToken(), getJWTSecret(), verifyToken(), requireProjectAccess(), validateEnvironmentName() (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.31
Nodes (12): inferSecretFileType(), isAllowedFileUploadName(), isAllowedPasteFileName(), isAllowedSecretFileName(), isEnvFileName(), isSafeSecretFileName(), UPLOAD_ALLOWED_EXTENSIONS, BLOCKED_PASTE_EXTENSIONS (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (9): auditPanic(), buildPanicBackupExport(), executePanicActions(), PanicExecutionResults, sendPanicResponse(), hasConfiguredPanicActions(), SECRET_FILE_TYPES, ISecretFile (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (20): AuthContext, AuthContextType, User, api, apiTokensAPI, dataTransferAPI, DataTransferImportResult, DataTransferSummary (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.35
Nodes (10): getProjectMemberAttributes(), hasProjectCapability(), isApiTokenCreatorAuthorized(), getUserOrgRole(), getUserProjectPermission(), canExecutePanicInOrg(), getPanicEligibleProjects(), getPanicEligibleProjectsForOrg() (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.20
Nodes (10): scripts, build, dev, start, test, test:e2e, test:integration, test:unit (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.19
Nodes (17): audit(), auditAccount(), auditComponent(), auditEnv(), auditMember(), AuditOptions, auditOrg(), auditProject() (+9 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (47): EncryptionStatus, decryptComponentData(), decryptComponentDataWithContext(), encryptComponentData(), encryptComponentDataWithContext(), getComponentContext(), componentKeyCache, createComponentEncryptionKey() (+39 more)

### Community 27 - "Community 27"
Cohesion: 0.40
Nodes (8): DEFAULT_ENVIRONMENTS, ensureProjectEnvironment(), importSecretFileRecord(), assertEnvAllowed(), getProjectEnvironments(), isValidEnvSlug(), normalizeEnvSlug(), RESERVED_ENV_SLUGS

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): bin, hashenv, description, engines, node, keywords, license, name (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (7): author, description, license, main, name, type, version

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (10): ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, ORG_PERMISSIONS, OrgPermission, PROJECT_PERMISSIONS, ProjectPermission, ROLE_ORG_PERMISSIONS, ADMIN_PERMISSIONS (+2 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (12): OrgPanicButton(), OrgPanicButtonProps, TopBarProps, UserMenu(), UserMenuProps, useOrgPanic(), Avatar(), AvatarGroup() (+4 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (29): AcceptInviteForm(), ActivityEntry, ProjectActivityPage(), ProjectPageHeader(), ProjectPageHeaderProps, ProjectShell(), useConfirm(), useToast() (+21 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (41): ApiToken, CreateApiTokenResponse, OrgInvite, OrgMember, OrgPermissionsResponse, ProjectInvite, arraysEqual(), formatOrgPermission() (+33 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (18): Secret, ACCOUNT_PROVIDERS, AccountFormSnapshot, AssociatedAccount, Project, accountsAPI, ProjectComponent, ProjectPermissionsResponse (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): logError(), sanitizeLogData(), SENSITIVE_PATTERNS

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (6): devDependencies, supertest, tsx, @types/cookie-parser, @types/supertest, vitest

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (20): canGrantOrgPermissions(), canGrantOrgRole(), canInviteToOrganization(), canManageProjectMember(), InviteGrantContext, OrgMemberAttributes, ProjectInviteGrantContext, ProjectMemberAttributes (+12 more)

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (4): diffEnvContent(), EnvDiffEntry, EnvDiffResult, parseEnvLines()

### Community 47 - "Community 47"
Cohesion: 0.40
Nodes (5): overrides, body-parser, ip-address, nanoid, postcss

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (4): ACCOUNT_PROVIDERS, AccountProvider, AssociatedAccountSchema, IAssociatedAccount

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (7): displayFont, geistMono, geistSans, metadata, AuthProvider(), ToastProvider(), QueryProvider()

### Community 50 - "Community 50"
Cohesion: 0.17
Nodes (17): getEncryptionStatus(), apiRateLimiter, invitePreviewRateLimiter, sanitizeError(), securityHeaders, uploadRateLimiter, router, router (+9 more)

### Community 51 - "Community 51"
Cohesion: 0.18
Nodes (12): hasConfiguredActions(), OrgPanicContext, OrgPanicContextValue, OrgPanicProvider(), ToastContext, ToastContextType, ToastItem, OrganizationSettingsResponse (+4 more)

### Community 52 - "Community 52"
Cohesion: 0.08
Nodes (36): DEFAULT_ENVIRONMENTS, inferSecretFileType(), isAllowedFileUploadName(), isAllowedPasteFileName(), isAllowedSecretFileName(), isEnvFileName(), isSafeSecretFileName(), UPLOAD_ALLOWED_EXTENSIONS (+28 more)

### Community 56 - "Community 56"
Cohesion: 0.16
Nodes (18): canGrantProjectPermissions(), generateVerificationToken(), getBrevoApiKey(), getSenderInfo(), sendEmailViaBrevo(), sendPasswordResetEmail(), sendProjectInviteEmail(), sendVerificationEmail() (+10 more)

## Knowledge Gaps
- **296 isolated node(s):** `name`, `version`, `description`, `type`, `main` (+291 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `contentTypeForSecretFile()` connect `Community 20` to `Community 9`, `Community 2`, `Community 27`, `Community 15`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 3` to `Community 32`, `Community 1`, `Community 34`, `Community 8`, `Community 12`, `Community 22`, `Community 31`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Community 32` to `Community 33`, `Community 34`, `Community 3`, `Community 8`, `Community 11`, `Community 12`, `Community 51`, `Community 22`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `useToast()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useToast()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `useOrganization()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useOrganization()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useAuth()` (e.g. with `ProjectSettingsPage()` and `SettingsPage()`) actually correct?**
  _`useAuth()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _296 weakly-connected nodes found - possible documentation gaps or missing edges._