# Graph Report - hashenv  (2026-08-21)

## Corpus Check
- 171 files · ~88,543 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1010 nodes · 2536 edges · 60 communities (53 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `87e86352`
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
- [[_COMMUNITY_Community 58|Community 58]]

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

## Communities (60 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (19): canGrantProjectPermissions(), EmailKind, formatFromAddress(), generateVerificationToken(), getSenderInfo(), getTransporter(), isDev(), logEmail() (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (12): CodeEditor(), CodeEditorProps, Navbar(), organizationsAPI, PanicButtonSettings, shallowRecordEqual(), Button(), ButtonProps (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.24
Nodes (11): ApiTokenRequest, authenticateApiToken(), checkRateLimit(), getRateLimitInfo(), rateLimitMap, requireApiScope(), requireApiTokenProject(), resolveComponentInProject() (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (26): Secret, ConfirmContext, ConfirmContextType, ConfirmOptions, ConfirmProvider(), ACCOUNT_PROVIDERS, AccountFormSnapshot, AssociatedAccount (+18 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (23): getProjectMemberAttributes(), hasProjectCapability(), isApiTokenCreatorAuthorized(), revokeApiTokensForUser(), getUserOrgRole(), getUserProjectPermission(), requireOrgPermission(), requireTeamOrganization() (+15 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (48): author, dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit (+40 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (33): dependencies, axios, next, react, react-dom, tailwindcss, @tanstack/react-query, @types/node (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (21): apiRequest(), cmdPull(), cmdRun(), cmdSecretGet(), cmdSecretSet(), cmdSecretsPut(), componentBase(), getConfig() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (8): validateEmail(), validatePassword(), validateRegistrationName(), validateRegistrationUsername(), LoginForm(), ResetPasswordForm(), PasswordInput(), PasswordInputProps

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (16): getInvitePreview(), getProjectInvitePreview(), apiRateLimiter, authRateLimiter, invitePreviewRateLimiter, sanitizeError(), securityHeaders, uploadRateLimiter (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (12): AcceptInviteForm(), CreateOrganizationModal(), CreateOrganizationModalProps, OrgSwitcher(), OrganizationContext, OrganizationContextType, OrganizationProvider(), useOrganization() (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (23): ProjectShell(), ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, getEffectiveOrgPermissions(), ORG_PERMISSIONS, OrgPermission, PROJECT_PERMISSIONS, ProjectPermission (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (7): OrganizationAuditPage(), OrgPageHeader(), OrgPageHeaderProps, AuditLogEntry, Breadcrumb, PageHeader(), PageHeaderProps

### Community 15 - "Community 15"
Cohesion: 0.31
Nodes (12): inferSecretFileType(), isAllowedFileUploadName(), isAllowedPasteFileName(), isAllowedSecretFileName(), isEnvFileName(), isSafeSecretFileName(), UPLOAD_ALLOWED_EXTENSIONS, BLOCKED_PASTE_EXTENSIONS (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (20): authenticate(), AuthRequest, comparePassword(), generateAccessToken(), generateToken(), getJWTSecret(), hashPassword(), verifyToken() (+12 more)

### Community 17 - "Community 17"
Cohesion: 0.36
Nodes (9): fetchAndDownloadBlob(), ApiErrorBody, assertBlobDownloadResponse(), extractApiErrorMessage(), extractValidationMessages(), getApiErrorMessage(), getApiErrorMessageSync(), readBlobErrorMessage() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.36
Nodes (6): ApiTokenScope, generateApiToken(), IProjectApiToken, ProjectApiToken, ProjectApiTokenSchema, router

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (8): DEFAULT_ENVIRONMENTS, ensureProjectEnvironment(), importSecretFileRecord(), assertEnvAllowed(), getProjectEnvironments(), isValidEnvSlug(), normalizeEnvSlug(), RESERVED_ENV_SLUGS

### Community 20 - "Community 20"
Cohesion: 0.36
Nodes (9): inferSecretFileType(), isAllowedFileUploadName(), isAllowedPasteFileName(), isAllowedSecretFileName(), isEnvFileName(), isSafeSecretFileName(), UPLOAD_ALLOWED_EXTENSIONS, EXTENSION_BY_TYPE (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (8): ConfirmDialog(), ConfirmDialogProps, Modal(), ModalActions(), ModalActionsProps, ModalProps, ModalSize, SIZE_CLASS

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (14): api, ApiToken, apiTokensAPI, CreateApiTokenResponse, DataTransferSummary, environmentsAPI, ProjectEnvironment, ProjectInvite (+6 more)

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (8): ProjectCardProps, ProjectListItem, AvatarGroup(), envTagVariant(), Tag(), TagProps, TagVariant, variantStyles

### Community 24 - "Community 24"
Cohesion: 0.23
Nodes (9): PaneLink(), RAIL_ICONS, Sidebar(), SidebarProps, getAccountNav(), getWorkspaceNav(), isNavActive(), NavLink (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.05
Nodes (58): decryptProjectData(), audit(), auditAccount(), auditComponent(), auditEnv(), auditMember(), AuditOptions, auditOrg() (+50 more)

### Community 26 - "Community 26"
Cohesion: 0.06
Nodes (54): bootstrapEncryption(), EncryptionStatus, getEncryptionStatus(), decryptComponentData(), decryptComponentDataWithContext(), encryptComponentData(), encryptComponentDataWithContext(), getComponentContext() (+46 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (44): getOrgMemberAttributes(), AuthRequestWithOrg, isProjectOwner(), loadComponentContext(), loadOrganizationContext(), loadProjectContext(), Permission, requireAccountAccess() (+36 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): bin, hashenv, description, engines, node, keywords, license, name (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (8): ToastContext, ToastContextType, ToastItem, ForgotPasswordPage(), styles, Toast(), ToastProps, ToastType

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (10): ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, ORG_PERMISSIONS, OrgPermission, PROJECT_PERMISSIONS, ProjectPermission, ROLE_ORG_PERMISSIONS, ADMIN_PERMISSIONS (+2 more)

### Community 31 - "Community 31"
Cohesion: 0.27
Nodes (8): AuthenticatedLayoutProps, OrgPanicButton(), OrgPanicButtonProps, sidebarOffsetClass(), TopBar(), TopBarProps, UserMenu(), useOrgPanic()

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (26): ActivityEntry, ProjectActivityPage(), ComponentDetailPage(), ProjectCard(), ProjectPageHeader(), ProjectPageHeaderProps, useConfirm(), useToast() (+18 more)

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (31): OrgInvite, OrgMember, OrgPermissionsResponse, arraysEqual(), formatOrgPermission(), formatProjectPermission(), memberResourceState(), normalizeIdList() (+23 more)

### Community 34 - "Community 34"
Cohesion: 0.26
Nodes (9): hasConfiguredActions(), OrgPanicContext, OrgPanicContextValue, OrgPanicProvider(), useAuthReady(), useOrgDataReady(), OrganizationSettingsResponse, queryKeys (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): logError(), sanitizeLogData(), SENSITIVE_PATTERNS

### Community 44 - "Community 44"
Cohesion: 0.24
Nodes (9): AuthenticatedLayout(), ProtectedRoute(), useAuth(), DashboardPage(), canCreateProject(), NewProjectPage(), useInvalidateProjects(), CreateProjectButton() (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.14
Nodes (22): canGrantOrgPermissions(), canGrantOrgRole(), canInviteToOrganization(), canManageOrgMember(), canManageProjectMember(), canPerformOrgAction(), InviteGrantContext, OrgMemberAttributes (+14 more)

### Community 46 - "Community 46"
Cohesion: 0.24
Nodes (7): dataTransferAPI, DataTransferImportResult, downloadJsonFile(), downloadTextFile(), DataTransferPanel(), DataTransferPanelProps, formatFileSize()

### Community 47 - "Community 47"
Cohesion: 0.24
Nodes (9): secretFilesAPI, countDiffChanges(), EnvDiffLine, EnvDiffType, mapServerDiffToLines(), ServerEnvDiff, SecretFileCompareModal(), SecretFileCompareModalProps (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (6): UserMenuProps, Avatar(), AvatarGroupProps, AvatarProps, initials(), sizeClasses

### Community 49 - "Community 49"
Cohesion: 0.14
Nodes (12): displayFont, geistMono, geistSans, metadata, AuthContext, AuthContextType, AuthProvider(), User (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.11
Nodes (22): sanitizeMongoQuery(), sanitizeString(), validateComponentId(), validateComponentName(), validateEnvironment(), validateEnvironmentName(), validateEnvironmentQuery(), validateEnvironmentSlugParam() (+14 more)

### Community 51 - "Community 51"
Cohesion: 0.23
Nodes (10): componentsAPI, formatEnvLabel(), defaultFileNameForType(), formatSecretFileType(), EditSecretFilePage(), SecretFileSelection, SecretFileUploadDropArea(), SecretFileUploadDropAreaProps (+2 more)

### Community 52 - "Community 52"
Cohesion: 0.53
Nodes (7): clearLastEnvironment(), getLastEnvironment(), LastEnvMap, readMap(), scopeKey(), setLastEnvironment(), writeMap()

### Community 53 - "Community 53"
Cohesion: 0.38
Nodes (5): getSettingsSections(), SettingsPage(), SettingsNav(), SettingsNavProps, Skeleton()

### Community 54 - "Community 54"
Cohesion: 0.40
Nodes (4): diffEnvContent(), EnvDiffEntry, EnvDiffResult, parseEnvLines()

### Community 57 - "Community 57"
Cohesion: 0.67
Nodes (3): SECRET_FILE_TYPES, ISecretFile, SecretFileSchema

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (3): buildContentDisposition(), sanitizeSecretFileName(), resolveFileName()

## Knowledge Gaps
- **295 isolated node(s):** `name`, `version`, `description`, `type`, `main` (+290 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `Community 1` to `Community 32`, `Community 33`, `Community 3`, `Community 11`, `Community 12`, `Community 44`, `Community 46`, `Community 47`, `Community 51`, `Community 53`, `Community 21`, `Community 23`, `Community 22`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Community 32` to `Community 33`, `Community 34`, `Community 3`, `Community 1`, `Community 8`, `Community 11`, `Community 12`, `Community 53`, `Community 22`, `Community 23`, `Community 29`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `diffEnvContent()` connect `Community 54` to `Community 50`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `useToast()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useToast()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `useOrganization()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useOrganization()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useAuth()` (e.g. with `ProjectSettingsPage()` and `SettingsPage()`) actually correct?**
  _`useAuth()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _295 weakly-connected nodes found - possible documentation gaps or missing edges._