# Graph Report - hashenv  (2026-07-10)

## Corpus Check
- 171 files · ~87,863 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 990 nodes · 2504 edges · 60 communities (55 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `98a0ffd6`
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
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 61|Community 61]]

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 37 edges
2. `Button()` - 31 edges
3. `useOrganization()` - 31 edges
4. `useAuth()` - 27 edges
5. `useProject()` - 18 edges
6. `useConfirm()` - 17 edges
7. `canWriteProject()` - 16 edges
8. `compilerOptions` - 16 edges
9. `audit()` - 15 edges
10. `compilerOptions` - 15 edges

## Surprising Connections (you probably didn't know these)
- `cmdPull()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdRun()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdSecretSet()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdSecretsPut()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `ForgotPasswordPage()` --calls--> `useToast()`  [EXTRACTED]
  frontend/app/forgot-password/page.tsx → frontend/contexts/ToastContext.tsx

## Import Cycles
- None detected.

## Communities (60 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.27
Nodes (9): accountsAPI, ProjectPermissionsResponse, projectsAPI, queryKeys, memberResourceState(), normalizeIdList(), Project, ProjectDetail (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (11): AuthenticatedLayout(), CodeEditor(), CodeEditorProps, Navbar(), ProtectedRoute(), UserMenu(), useAuth(), getSettingsSections() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (21): requireProjectAccess(), SECRET_FILE_TYPES, sanitizeMongoQuery(), sanitizeString(), validateEnvironment(), validateEnvironmentName(), validateEnvironmentQuery(), validateEnvironmentSlugParam() (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (14): ActivityEntry, ProjectPageHeader(), ProjectPageHeaderProps, ProjectEnvironmentsPage(), useAuthReady(), environmentsAPI, fetchProjectEnvironments(), useInvalidateProjectEnvironments() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (6): UserMenuProps, Avatar(), AvatarGroupProps, AvatarProps, initials(), sizeClasses

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (41): author, dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (29): dependencies, axios, next, react, react-dom, tailwindcss, @tanstack/react-query, @types/node (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (21): apiRequest(), cmdPull(), cmdRun(), cmdSecretGet(), cmdSecretSet(), cmdSecretsPut(), componentBase(), getConfig() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (26): ToastContext, ToastContextType, ToastItem, ForgotPasswordPage(), authAPI, fetchAndDownloadBlob(), ApiErrorBody, assertBlobDownloadResponse() (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.27
Nodes (8): OrgInvite, OrgMember, OrgPermissionsResponse, EditOrgMemberModal(), EditOrgMemberModalProps, OrgMemberSelect(), OrgMemberSelectProps, OrgPermissionPicker()

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (8): CreateOrganizationModal(), CreateOrganizationModalProps, OrgSwitcher(), OrganizationContext, OrganizationContextType, useOrganization(), Organization, setForbiddenHandler()

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (18): ProjectShell(), ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, getEffectiveOrgPermissions(), ORG_PERMISSIONS, OrgPermission, PROJECT_PERMISSIONS, ProjectPermission (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.27
Nodes (7): EditProjectMemberModal(), EditProjectMemberModalProps, ProjectMemberSaveData, formatMemberResourceScope(), ResourceOption, ResourceScopePicker(), ResourceScopePickerProps

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (19): audit(), auditAccount(), auditComponent(), auditEnv(), auditMember(), AuditOptions, auditOrg(), auditProject() (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (19): authenticate(), AuthRequest, comparePassword(), generateAccessToken(), generateToken(), getJWTSecret(), hashPassword(), verifyToken() (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.23
Nodes (15): inferSecretFileType(), isAllowedFileUploadName(), isAllowedPasteFileName(), isAllowedSecretFileName(), isEnvFileName(), isSafeSecretFileName(), UPLOAD_ALLOWED_EXTENSIONS, BLOCKED_PASTE_EXTENSIONS (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.53
Nodes (7): clearLastEnvironment(), getLastEnvironment(), LastEnvMap, readMap(), scopeKey(), setLastEnvironment(), writeMap()

### Community 19 - "Community 19"
Cohesion: 0.23
Nodes (13): ComponentDetailPage(), ProjectCard(), ACCOUNT_PROVIDERS, AccountFormSnapshot, AssociatedAccount, Project, ProjectDetailPage(), canCreateProjectAccounts() (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.36
Nodes (9): inferSecretFileType(), isAllowedFileUploadName(), isAllowedPasteFileName(), isAllowedSecretFileName(), isEnvFileName(), isSafeSecretFileName(), UPLOAD_ALLOWED_EXTENSIONS, EXTENSION_BY_TYPE (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (7): ConfirmDialog(), ConfirmDialogProps, ModalActions(), ModalActionsProps, ModalProps, ModalSize, SIZE_CLASS

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (16): AcceptInviteForm(), AuthContext, AuthContextType, User, api, apiTokensAPI, DataTransferSummary, getAccessToken() (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.43
Nodes (5): ApiToken, CreateApiTokenResponse, arraysEqual(), EditApiTokenModal(), EditApiTokenModalProps

### Community 24 - "Community 24"
Cohesion: 0.21
Nodes (14): PaneLink(), RAIL_ICONS, Sidebar(), sidebarOffsetClass(), SidebarProps, getAccountNav(), getOrgNav(), getWorkspaceNav() (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (23): buildOrganizationExport(), buildProjectExport(), countExportableItems(), countExportedProjectItems(), decryptAccountCredentials(), emptySummary(), encryptAccountCredentials(), ExportedAccount (+15 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (52): bootstrapEncryption(), EncryptionStatus, getEncryptionStatus(), decryptComponentData(), decryptComponentDataWithContext(), encryptComponentData(), encryptComponentDataWithContext(), getComponentContext() (+44 more)

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (12): deleteComponentEncryptionKey(), requireComponentAccess(), deleteComponentCascade(), deleteProjectComponents(), isValidComponentSlug(), normalizeComponentSlug(), RESERVED_COMPONENT_SLUGS, slugFromComponentName() (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): bin, hashenv, description, engines, node, keywords, license, name (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (7): OrganizationAuditPage(), OrgPageHeader(), OrgPageHeaderProps, AuditLogEntry, Breadcrumb, PageHeader(), PageHeaderProps

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (10): ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, ORG_PERMISSIONS, OrgPermission, PROJECT_PERMISSIONS, ProjectPermission, ROLE_ORG_PERMISSIONS, ADMIN_PERMISSIONS (+2 more)

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (12): AuthenticatedLayoutProps, OrgPanicButton(), OrgPanicButtonProps, TopBar(), TopBarProps, hasConfiguredActions(), OrgPanicContext, OrgPanicContextValue (+4 more)

### Community 32 - "Community 32"
Cohesion: 0.19
Nodes (18): ProjectActivityPage(), ConfirmContext, ConfirmContextType, ConfirmOptions, useConfirm(), useToast(), ProjectEnvironment, canExportProject() (+10 more)

### Community 33 - "Community 33"
Cohesion: 0.19
Nodes (10): formatOrgPermission(), formatProjectPermission(), EffectivePermissionsPanelProps, formatPermissionLabel(), MISSING_HINTS, PROJECT_ACCESS_LABELS, OrgPermissionPickerProps, PermissionPickerProps (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.21
Nodes (10): Secret, ProjectComponent, secretsAPI, Button(), ButtonProps, SensitiveField, SensitiveValueModal(), SensitiveValueModalProps (+2 more)

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): logError(), sanitizeLogData(), SENSITIVE_PATTERNS

### Community 44 - "Community 44"
Cohesion: 0.27
Nodes (8): DashboardPage(), useOrgDataReady(), canCreateProject(), NewProjectPage(), useInvalidateProjects(), useProjects(), CreateProjectButton(), CreateProjectButtonProps

### Community 45 - "Community 45"
Cohesion: 0.05
Nodes (90): canGrantOrgPermissions(), canGrantOrgRole(), canGrantProjectPermissions(), canInviteToOrganization(), canManageOrgMember(), canManageProjectMember(), canPerformOrgAction(), getOrgMemberAttributes() (+82 more)

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (4): diffEnvContent(), EnvDiffEntry, EnvDiffResult, parseEnvLines()

### Community 47 - "Community 47"
Cohesion: 0.24
Nodes (9): countDiffChanges(), EnvDiffLine, EnvDiffType, mapServerDiffToLines(), ServerEnvDiff, Modal(), SecretFileCompareModal(), SecretFileCompareModalProps (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.27
Nodes (8): ProjectCardProps, ProjectListItem, AvatarGroup(), envTagVariant(), Tag(), TagProps, TagVariant, variantStyles

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (9): displayFont, geistMono, geistSans, metadata, AuthProvider(), ConfirmProvider(), OrganizationProvider(), ToastProvider() (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (16): getInvitePreview(), getProjectInvitePreview(), apiRateLimiter, authRateLimiter, invitePreviewRateLimiter, sanitizeError(), securityHeaders, uploadRateLimiter (+8 more)

### Community 51 - "Community 51"
Cohesion: 0.26
Nodes (10): auditPanic(), buildPanicBackupExport(), executePanicActions(), PanicExecutionResults, sendPanicResponse(), DEFAULT_PANIC_BUTTON_SETTINGS, hasConfiguredPanicActions(), PanicButtonSettings (+2 more)

### Community 52 - "Community 52"
Cohesion: 0.17
Nodes (12): DEFAULT_ENVIRONMENTS, componentsAPI, secretFilesAPI, formatEnvLabel(), defaultFileNameForType(), formatSecretFileType(), EditSecretFilePage(), SecretFileSelection (+4 more)

### Community 53 - "Community 53"
Cohesion: 0.40
Nodes (8): DEFAULT_ENVIRONMENTS, ensureProjectEnvironment(), importSecretFileRecord(), assertEnvAllowed(), getProjectEnvironments(), isValidEnvSlug(), normalizeEnvSlug(), RESERVED_ENV_SLUGS

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (17): ApiTokenRequest, authenticateApiToken(), checkRateLimit(), getRateLimitInfo(), rateLimitMap, requireApiScope(), requireApiTokenProject(), resolveComponentInProject() (+9 more)

### Community 55 - "Community 55"
Cohesion: 0.46
Nodes (7): getBrevoApiKey(), getSenderInfo(), sendEmailViaBrevo(), sendOrgInviteEmail(), sendPasswordResetEmail(), sendProjectInviteEmail(), sendVerificationEmail()

### Community 56 - "Community 56"
Cohesion: 0.40
Nodes (4): ACCOUNT_PROVIDERS, AccountProvider, AssociatedAccountSchema, IAssociatedAccount

### Community 57 - "Community 57"
Cohesion: 0.24
Nodes (7): dataTransferAPI, DataTransferImportResult, downloadJsonFile(), downloadTextFile(), DataTransferPanel(), DataTransferPanelProps, formatFileSize()

### Community 61 - "Community 61"
Cohesion: 0.38
Nodes (6): PanicButtonSettings, shallowRecordEqual(), describeEnabledActions(), OrgPanicSettingsPanel(), OrgPanicSettingsPanelProps, PANIC_ACTION_OPTIONS

## Knowledge Gaps
- **284 isolated node(s):** `name`, `version`, `description`, `type`, `main` (+279 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `Community 34` to `Community 0`, `Community 1`, `Community 3`, `Community 9`, `Community 11`, `Community 12`, `Community 14`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 32`, `Community 44`, `Community 47`, `Community 48`, `Community 52`, `Community 57`, `Community 61`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Community 32` to `Community 0`, `Community 1`, `Community 34`, `Community 3`, `Community 8`, `Community 9`, `Community 48`, `Community 19`, `Community 22`, `Community 24`, `Community 61`, `Community 31`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `useOrganization()` connect `Community 11` to `Community 0`, `Community 32`, `Community 9`, `Community 12`, `Community 44`, `Community 22`, `Community 24`, `Community 29`, `Community 31`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `useToast()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useToast()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `useOrganization()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useOrganization()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useAuth()` (e.g. with `ProjectSettingsPage()` and `SettingsPage()`) actually correct?**
  _`useAuth()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _284 weakly-connected nodes found - possible documentation gaps or missing edges._