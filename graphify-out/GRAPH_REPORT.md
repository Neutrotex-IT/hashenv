# Graph Report - hashenv  (2026-07-08)

## Corpus Check
- 164 files · ~82,608 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 927 nodes · 2336 edges · 58 communities (52 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `73d9c36e`
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
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 39 edges
2. `Button()` - 31 edges
3. `useOrganization()` - 31 edges
4. `useAuth()` - 27 edges
5. `useProject()` - 18 edges
6. `useConfirm()` - 17 edges
7. `compilerOptions` - 16 edges
8. `audit()` - 15 edges
9. `compilerOptions` - 15 edges
10. `SkeletonCard()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `cmdPull()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdRun()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdSecretSet()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `cmdSecretsPut()` --calls--> `parseArgs()`  [INFERRED]
  cli/bin/hashenv.js → backend/scripts/wipe-database.ts
- `OrganizationMembersPage()` --calls--> `useConfirm()`  [INFERRED]
  frontend/app/organizations/[orgId]/members/page.tsx → frontend/contexts/ConfirmContext.tsx

## Import Cycles
- None detected.

## Communities (58 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.51
Nodes (8): getProjectMemberAttributes(), hasProjectCapability(), isApiTokenCreatorAuthorized(), getUserOrgRole(), getUserProjectPermission(), canExecutePanicInOrg(), getPanicEligibleProjects(), getPanicEligibleProjectsForOrg()

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (19): audit(), auditAccount(), auditComponent(), auditEnv(), auditMember(), AuditOptions, auditOrg(), auditProject() (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (22): requireProjectAccess(), SECRET_FILE_TYPES, sanitizeMongoQuery(), sanitizeString(), validateEnvironment(), validateEnvironmentName(), validateEnvironmentQuery(), validateEnvironmentSlugParam() (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (20): ActivityEntry, ProjectActivityPage(), ProjectPageHeader(), ProjectPageHeaderProps, ProjectEnvironmentsPage(), useAuthReady(), projectsAPI, queryKeys (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (22): decryptComponentData(), decryptComponentDataWithContext(), encryptComponentData(), encryptComponentDataWithContext(), getComponentContext(), getComponentEncryptionKey(), getProjectEncryptionKey(), decrypt() (+14 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (41): author, dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (23): dependencies, axios, next, react, react-dom, tailwindcss, @tanstack/react-query, @types/node (+15 more)

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (21): apiRequest(), cmdPull(), cmdRun(), cmdSecretGet(), cmdSecretSet(), cmdSecretsPut(), componentBase(), getConfig() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (20): api, dataTransferAPI, DataTransferImportResult, DataTransferSummary, environmentsAPI, OrgMember, PanicButtonSettings, ProjectEnvironment (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (4): AuthenticatedLayout(), AuthenticatedLayoutProps, ProtectedRoute(), sidebarOffsetClass()

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.31
Nodes (8): CreateOrganizationModal(), CreateOrganizationModalProps, OrgSwitcher(), OrganizationContext, OrganizationContextType, useOrganization(), Organization, setForbiddenHandler()

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (14): ApiTokenRequest, authenticateApiToken(), checkRateLimit(), getRateLimitInfo(), rateLimitMap, requireApiScope(), requireApiTokenProject(), resolveComponentInProject() (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (28): OrganizationAuditPage(), ProjectShell(), ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, getEffectiveOrgPermissions(), ORG_PERMISSIONS, OrgPermission, PROJECT_PERMISSIONS (+20 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): authAPI, fetchAndDownloadBlob(), ApiErrorBody, assertBlobDownloadResponse(), extractApiErrorMessage(), extractValidationMessages(), getApiErrorMessage(), getApiErrorMessageSync() (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (19): authenticate(), comparePassword(), generateAccessToken(), generateToken(), getJWTSecret(), hashPassword(), verifyToken(), authRateLimiter (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (23): ComponentDetailPage(), ProjectCard(), ProjectCardProps, ConfirmContext, ConfirmContextType, ConfirmOptions, useConfirm(), ProjectDetailPage() (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (10): ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, ORG_PERMISSIONS, OrgPermission, PROJECT_PERMISSIONS, ProjectPermission, ROLE_ORG_PERMISSIONS, ADMIN_PERMISSIONS (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (25): Secret, OrgPageHeader(), OrgPageHeaderProps, ACCOUNT_PROVIDERS, AccountFormSnapshot, AssociatedAccount, Project, accountsAPI (+17 more)

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (3): EXTENSION_BY_TYPE, formatSecretFileType(), SECRET_FILE_TYPE_OPTIONS

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (16): arraysEqual(), AvatarGroup(), Button(), ButtonProps, ConfirmDialogProps, EditApiTokenModal(), EditOrgMemberModal(), EditProjectMemberModal() (+8 more)

### Community 22 - "Community 22"
Cohesion: 0.24
Nodes (13): canGrantOrgPermissions(), canGrantOrgRole(), canInviteToOrganization(), canManageOrgMember(), canManageProjectMember(), canPerformOrgAction(), ProjectInviteGrantContext, ROLE_RANK (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (18): canGrantProjectPermissions(), generateVerificationToken(), getBrevoApiKey(), getSenderInfo(), sendEmailViaBrevo(), sendOrgInviteEmail(), sendPasswordResetEmail(), sendProjectInviteEmail() (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (8): PaneLink(), RAIL_ICONS, Sidebar(), SidebarProps, getAccountNav(), getWorkspaceNav(), isNavActive(), NavLink

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (22): createComponentEncryptionKey(), buildOrganizationExport(), buildProjectExport(), emptySummary(), encryptAccountCredentials(), ensureComponent(), ExportedAccount, ExportedComponent (+14 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (15): componentKeyCache, createOrgEncryptionKey(), createProjectEncryptionKey(), deleteProjectEncryptionKey(), getInstanceKey(), getOrgEncryptionKey(), orgKeyCache, projectKeyCache (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (28): getOrgMemberAttributes(), revokeApiTokensForUser(), AuthRequest, AuthRequestWithOrg, isProjectOwner(), loadComponentContext(), loadOrganizationContext(), loadProjectContext() (+20 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): bin, hashenv, description, engines, node, keywords, license, name (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (13): apiRateLimiter, isValidObjectId(), sanitizeError(), securityHeaders, uploadRateLimiter, router, router, router (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.20
Nodes (13): deleteComponentEncryptionKey(), requireComponentAccess(), deleteComponentCascade(), deleteProjectComponents(), isValidComponentSlug(), normalizeComponentSlug(), RESERVED_COMPONENT_SLUGS, slugFromComponentName() (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (6): ToastContextType, ToastItem, styles, Toast(), ToastProps, ToastType

### Community 32 - "Community 32"
Cohesion: 0.19
Nodes (13): ToastContext, useToast(), ForgotPasswordPage(), componentsAPI, organizationsAPI, shallowRecordEqual(), NewComponentPage(), describeEnabledActions() (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (15): OrgInvite, OrgPermissionsResponse, formatOrgPermission(), formatProjectPermission(), OrganizationMembersPage(), EffectivePermissionsPanel(), EffectivePermissionsPanelProps, formatPermissionLabel() (+7 more)

### Community 34 - "Community 34"
Cohesion: 0.27
Nodes (8): DashboardPage(), useOrgDataReady(), canCreateProject(), NewProjectPage(), useInvalidateProjects(), useProjects(), CreateProjectButton(), CreateProjectButtonProps

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): logError(), sanitizeLogData(), SENSITIVE_PATTERNS

### Community 44 - "Community 44"
Cohesion: 0.19
Nodes (12): auditPanic(), buildPanicBackupExport(), countExportableItems(), countExportedProjectItems(), executePanicActions(), PanicExecutionResults, sendPanicResponse(), hasConfiguredPanicActions() (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (13): requireOrgPermission(), requireTeamOrganization(), getOrganizationPanicSettings(), getOrganizationSettingsPayload(), upsertOrganizationPanicSettings(), DEFAULT_PANIC_BUTTON_SETTINGS, mergePanicButtonSettings(), PanicButtonSettings (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (4): diffEnvContent(), EnvDiffEntry, EnvDiffResult, parseEnvLines()

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (14): displayFont, geistMono, geistSans, metadata, AuthContext, AuthContextType, AuthProvider(), User (+6 more)

### Community 48 - "Community 48"
Cohesion: 0.21
Nodes (7): AcceptInviteForm(), CodeEditor(), CodeEditorProps, Navbar(), useAuth(), InvitePreview, invitesAPI

### Community 49 - "Community 49"
Cohesion: 0.19
Nodes (11): OrgPanicButton(), OrgPanicButtonProps, TopBar(), TopBarProps, UserMenu(), hasConfiguredActions(), OrgPanicContext, OrgPanicContextValue (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (6): UserMenuProps, Avatar(), AvatarGroupProps, AvatarProps, initials(), sizeClasses

### Community 53 - "Community 53"
Cohesion: 0.17
Nodes (12): bootstrapEncryption(), EncryptionStatus, getEncryptionStatus(), clearKeyCache(), getRootKey(), initializeKeyStore(), reWrapInstanceKey(), deriveKeyFromSecret() (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.25
Nodes (10): inferSecretFileType(), isAllowedSecretFileName(), ALLOWED_SECRET_FILE_EXTENSIONS, buildContentDisposition(), contentTypeForSecretFile(), extractExtension(), FILE_TYPE_BY_EXTENSION, sanitizeSecretFileName() (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (8): DEFAULT_ENVIRONMENTS, ensureProjectEnvironment(), importSecretFileRecord(), assertEnvAllowed(), getProjectEnvironments(), isValidEnvSlug(), normalizeEnvSlug(), RESERVED_ENV_SLUGS

### Community 56 - "Community 56"
Cohesion: 0.19
Nodes (11): secretFilesAPI, countDiffChanges(), EnvDiffLine, EnvDiffType, mapServerDiffToLines(), ServerEnvDiff, formatEnvLabel(), EditSecretFilePage() (+3 more)

### Community 57 - "Community 57"
Cohesion: 0.24
Nodes (8): InviteGrantContext, OrgMemberAttributes, IOrgInvite, OrgInviteSchema, OrgInviteStatus, IOrgMember, OrgMemberSchema, OrgRole

### Community 58 - "Community 58"
Cohesion: 0.50
Nodes (3): IProjectInvite, ProjectInviteSchema, ProjectInviteStatus

## Knowledge Gaps
- **275 isolated node(s):** `name`, `version`, `description`, `type`, `main` (+270 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 32` to `Community 33`, `Community 3`, `Community 8`, `Community 14`, `Community 15`, `Community 48`, `Community 17`, `Community 49`, `Community 19`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `Button()` connect `Community 21` to `Community 32`, `Community 33`, `Community 34`, `Community 3`, `Community 8`, `Community 11`, `Community 48`, `Community 17`, `Community 19`, `Community 56`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `useOrganization()` connect `Community 11` to `Community 32`, `Community 33`, `Community 34`, `Community 3`, `Community 14`, `Community 48`, `Community 49`, `Community 21`, `Community 24`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `useToast()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useToast()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `useOrganization()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useOrganization()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useAuth()` (e.g. with `ProjectSettingsPage()` and `SettingsPage()`) actually correct?**
  _`useAuth()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _275 weakly-connected nodes found - possible documentation gaps or missing edges._