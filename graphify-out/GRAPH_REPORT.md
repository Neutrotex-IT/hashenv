# Graph Report - hashenv  (2026-06-29)

## Corpus Check
- 151 files · ~76,566 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 851 nodes · 2076 edges · 48 communities (42 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f136cd3d`
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

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 33 edges
2. `useOrganization()` - 31 edges
3. `Button()` - 27 edges
4. `useAuth()` - 27 edges
5. `compilerOptions` - 16 edges
6. `compilerOptions` - 15 edges
7. `useConfirm()` - 15 edges
8. `SkeletonCard()` - 14 edges
9. `useProject()` - 14 edges
10. `useProjectPermissions()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `cmdEnvPut()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdPull()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdRun()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdSecretSet()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `OrganizationMembersPage()` --calls--> `useOrganization()`  [INFERRED]
  frontend/app/organizations/[orgId]/members/page.tsx → frontend/contexts/OrganizationContext.tsx

## Import Cycles
- None detected.

## Communities (48 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (22): getProjectMemberAttributes(), hasProjectCapability(), isApiTokenCreatorAuthorized(), revokeApiTokensForUser(), getUserOrgRole(), getUserProjectPermission(), getOrganizationPanicSettings(), getOrganizationSettingsPayload() (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (28): decryptProjectData(), encryptProjectData(), getProjectOrgId(), buildOrganizationExport(), buildProjectExport(), decryptAccountCredentials(), emptySummary(), encryptAccountCredentials() (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (23): requireProjectAccess(), isValidObjectId(), uploadRateLimiter, sanitizeMongoQuery(), sanitizeString(), validateEnvFileId(), validateEnvironment(), validateEnvironmentName() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.21
Nodes (17): ActivityEntry, ProjectActivityPage(), ProjectCard(), ProjectPageHeader(), ProjectPageHeaderProps, ProjectEnvironmentsPage(), ProjectDetailPage(), envAPI (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (34): bootstrapEncryption(), EncryptionStatus, getEncryptionStatus(), clearKeyCache(), createOrgEncryptionKey(), createProjectEncryptionKey(), deleteProjectEncryptionKey(), getInstanceKey() (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (41): author, dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (23): dependencies, axios, next, react, react-dom, tailwindcss, @tanstack/react-query, @types/node (+15 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (19): apiRequest(), cmdEnvPut(), cmdPull(), cmdRun(), cmdSecretGet(), cmdSecretSet(), getConfig(), main() (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (15): api, apiTokensAPI, DataTransferSummary, getAccessToken(), InvitePreview, invitesAPI, OrganizationSettingsResponse, OrgMember (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (38): displayFont, geistMono, geistSans, metadata, AuthenticatedLayout(), AuthenticatedLayoutProps, CodeEditor(), CodeEditorProps (+30 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (6): CreateOrganizationModal(), CreateOrganizationModalProps, OrganizationContext, OrganizationContextType, Organization, setForbiddenHandler()

### Community 12 - "Community 12"
Cohesion: 0.21
Nodes (14): ApiTokenRequest, authenticateApiToken(), checkRateLimit(), getRateLimitInfo(), rateLimitMap, requireApiScope(), requireApiTokenProject(), ApiTokenScope (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (41): OrgSwitcher(), ProjectShell(), PaneLink(), RAIL_ICONS, Sidebar(), SidebarProps, ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS (+33 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): authAPI, fetchAndDownloadBlob(), ApiErrorBody, assertBlobDownloadResponse(), extractApiErrorMessage(), extractValidationMessages(), getApiErrorMessage(), getApiErrorMessageSync() (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (20): authenticate(), AuthRequest, comparePassword(), generateAccessToken(), generateToken(), getJWTSecret(), hashPassword(), verifyToken() (+12 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (10): DEFAULT_ENV_SLUGS, ProjectCardProps, DEFAULT_ENVIRONMENTS, formatEnvLabel(), ProjectListItem, envTagVariant(), Tag(), TagProps (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (10): ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, ORG_PERMISSIONS, OrgPermission, PROJECT_PERMISSIONS, ProjectPermission, ROLE_ORG_PERMISSIONS, ADMIN_PERMISSIONS (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (13): ACCOUNT_PROVIDERS, AccountFormSnapshot, AssociatedAccount, EnvVersion, Project, Secret, accountsAPI, ProjectPermissionsResponse (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (7): dataTransferAPI, DataTransferImportResult, downloadJsonFile(), downloadTextFile(), DataTransferPanel(), DataTransferPanelProps, formatFileSize()

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (18): ApiToken, CreateApiTokenResponse, arraysEqual(), Button(), ButtonProps, ConfirmDialogProps, EditApiTokenModal(), EditApiTokenModalProps (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (18): canGrantOrgPermissions(), canGrantOrgRole(), canInviteToOrganization(), canManageOrgMember(), canManageProjectMember(), canPerformOrgAction(), InviteGrantContext, OrgMemberAttributes (+10 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (18): canGrantProjectPermissions(), generateVerificationToken(), getBrevoApiKey(), getSenderInfo(), sendEmailViaBrevo(), sendOrgInviteEmail(), sendPasswordResetEmail(), sendProjectInviteEmail() (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (14): OrgInvite, OrgPermissionsResponse, formatOrgPermission(), formatProjectPermission(), EffectivePermissionsPanel(), EffectivePermissionsPanelProps, formatPermissionLabel(), MISSING_HINTS (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (13): AcceptInviteForm(), ConfirmContext, ConfirmContextType, ConfirmOptions, ConfirmProvider(), useConfirm(), useToast(), ForgotPasswordPage() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.27
Nodes (8): countDiffChanges(), EnvDiffLine, EnvDiffType, mapServerDiffToLines(), ServerEnvDiff, EnvCompareModal(), EnvCompareModalProps, EnvVersionOption

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (19): getOrgMemberAttributes(), AuthRequestWithOrg, isProjectOwner(), loadOrganizationContext(), loadProjectContext(), Permission, requireOrgAdmin(), requireOrgMember() (+11 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): bin, hashenv, description, engines, node, keywords, license, name (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (14): getInvitePreview(), getProjectInvitePreview(), apiRateLimiter, authRateLimiter, invitePreviewRateLimiter, sanitizeError(), securityHeaders, router (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.20
Nodes (15): audit(), auditAccount(), auditEnv(), auditMember(), AuditOptions, auditOrg(), auditProject(), auditSecret() (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (7): ToastContext, ToastContextType, ToastItem, styles, Toast(), ToastProps, ToastType

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (10): OrganizationAuditPage(), OrgPageHeader(), AuditLogEntry, organizationsAPI, PanicButtonSettings, shallowRecordEqual(), describeEnabledActions(), OrgPanicSettingsPanel() (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (11): useOrganization(), hasConfiguredActions(), OrgPanicContext, OrgPanicContextValue, OrgPanicProvider(), useAuthReady(), useOrgDataReady(), environmentsAPI (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.21
Nodes (8): projectsAPI, Project, ProjectDetail, useInvalidateProject(), ProjectSettingsPage(), SkeletonCard(), SkeletonDataTable(), SkeletonProps

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): logError(), sanitizeLogData(), SENSITIVE_PATTERNS

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (12): auditPanic(), buildPanicBackupExport(), countExportableItems(), countExportedProjectItems(), executePanicActions(), PanicExecutionResults, sendPanicResponse(), DEFAULT_PANIC_BUTTON_SETTINGS (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.40
Nodes (8): DEFAULT_ENVIRONMENTS, ensureProjectEnvironment(), importEnvFile(), assertEnvAllowed(), getProjectEnvironments(), isValidEnvSlug(), normalizeEnvSlug(), RESERVED_ENV_SLUGS

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (4): diffEnvContent(), EnvDiffEntry, EnvDiffResult, parseEnvLines()

## Knowledge Gaps
- **268 isolated node(s):** `name`, `version`, `description`, `type`, `main` (+263 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 25` to `Community 32`, `Community 33`, `Community 34`, `Community 3`, `Community 8`, `Community 9`, `Community 14`, `Community 15`, `Community 17`, `Community 19`, `Community 24`, `Community 31`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `Button()` connect `Community 21` to `Community 32`, `Community 34`, `Community 3`, `Community 8`, `Community 9`, `Community 11`, `Community 14`, `Community 17`, `Community 19`, `Community 20`, `Community 24`, `Community 25`, `Community 26`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 9` to `Community 33`, `Community 34`, `Community 3`, `Community 8`, `Community 11`, `Community 15`, `Community 19`, `Community 25`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `useToast()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useToast()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `useOrganization()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useOrganization()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useAuth()` (e.g. with `ProjectSettingsPage()` and `SettingsPage()`) actually correct?**
  _`useAuth()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _268 weakly-connected nodes found - possible documentation gaps or missing edges._