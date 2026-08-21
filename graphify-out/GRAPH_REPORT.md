# Graph Report - hashenv  (2026-08-21)

## Corpus Check
- 171 files · ~88,517 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 995 nodes · 2512 edges · 45 communities (40 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b2323870`
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
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
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
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]

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
- `OrganizationMembersPage()` --calls--> `useOrganization()`  [INFERRED]
  frontend/app/organizations/[orgId]/members/page.tsx → frontend/contexts/OrganizationContext.tsx

## Import Cycles
- None detected.

## Communities (45 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (20): applyMemberScopeFields(), canAccessScopedResource(), canGrantResourceScope(), memberScopeFieldsFromGrant(), parseRestrictedResourceScope(), removeResourceFromMemberScopes(), resolveMemberResourceScope(), sanitizeResourceIdList() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.22
Nodes (7): CodeEditor(), CodeEditorProps, Navbar(), Button(), ButtonProps, UploadSecretFileButton(), UploadSecretFileButtonProps

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (53): inferSecretFileType(), isAllowedFileUploadName(), isAllowedPasteFileName(), isAllowedSecretFileName(), isEnvFileName(), isSafeSecretFileName(), UPLOAD_ALLOWED_EXTENSIONS, deleteComponentEncryptionKey() (+45 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (11): settingsAPI, getSettingsSections(), SettingsPage(), Breadcrumb, PageHeader(), PageHeaderProps, SettingsNav(), SettingsNavProps (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.20
Nodes (17): getProjectMemberAttributes(), isApiTokenCreatorAuthorized(), getUserOrgRole(), getUserProjectPermission(), requireOrgPermission(), requireTeamOrganization(), parseImportPayload(), getOrganizationPanicSettings() (+9 more)

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
Nodes (25): authAPI, dataTransferAPI, DataTransferImportResult, fetchAndDownloadBlob(), ApiErrorBody, assertBlobDownloadResponse(), extractApiErrorMessage(), extractValidationMessages() (+17 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (14): AcceptInviteForm(), CreateOrganizationModal(), CreateOrganizationModalProps, OrgSwitcher(), PaneLink(), RAIL_ICONS, SidebarProps, OrganizationContext (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (18): ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, getEffectiveOrgPermissions(), ORG_PERMISSIONS, OrgPermission, PROJECT_PERMISSIONS, ProjectPermission, ROLE_ORG_PERMISSIONS (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (28): comparePassword(), hashPassword(), generateVerificationToken(), getBrevoApiKey(), getSenderInfo(), sendEmailViaBrevo(), sendOrgInviteEmail(), sendPasswordResetEmail() (+20 more)

### Community 20 - "Community 20"
Cohesion: 0.36
Nodes (9): inferSecretFileType(), isAllowedFileUploadName(), isAllowedPasteFileName(), isAllowedSecretFileName(), isEnvFileName(), isSafeSecretFileName(), UPLOAD_ALLOWED_EXTENSIONS, EXTENSION_BY_TYPE (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (18): ConfirmContext, ConfirmContextType, ConfirmOptions, ConfirmProvider(), ApiToken, CreateApiTokenResponse, arraysEqual(), ConfirmDialog() (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (15): api, apiTokensAPI, DataTransferSummary, environmentsAPI, PanicButtonSettings, ProjectEnvironment, ProjectMemberResourcePayload, refreshSubscribers (+7 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (14): OrganizationAuditPage(), OrgPageHeader(), OrgPageHeaderProps, Sidebar(), AuditLogEntry, getAccountNav(), getOrgNav(), getWorkspaceNav() (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.05
Nodes (64): DEFAULT_ENVIRONMENTS, audit(), auditAccount(), auditComponent(), auditEnv(), auditMember(), AuditOptions, auditOrg() (+56 more)

### Community 26 - "Community 26"
Cohesion: 0.06
Nodes (58): bootstrapEncryption(), EncryptionStatus, getEncryptionStatus(), decryptComponentData(), decryptComponentDataWithContext(), encryptComponentData(), encryptComponentDataWithContext(), getComponentContext() (+50 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (21): getOrgMemberAttributes(), AuthRequestWithOrg, isProjectOwner(), loadComponentContext(), loadOrganizationContext(), loadProjectContext(), Permission, requireOrgAdmin() (+13 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): bin, hashenv, description, engines, node, keywords, license, name (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (10): ALL_ORG_PERMISSIONS, ALL_PROJECT_PERMISSIONS, ORG_PERMISSIONS, OrgPermission, PROJECT_PERMISSIONS, ProjectPermission, ROLE_ORG_PERMISSIONS, ADMIN_PERMISSIONS (+2 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (13): OrgPanicButton(), OrgPanicButtonProps, TopBar(), TopBarProps, UserMenu(), UserMenuProps, hasConfiguredActions(), OrgPanicContext (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (26): ActivityEntry, ProjectActivityPage(), ComponentDetailPage(), ProjectPageHeader(), ProjectPageHeaderProps, useConfirm(), useToast(), ProjectEnvironmentsPage() (+18 more)

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (30): OrgInvite, OrgMember, OrgPermissionsResponse, ProjectInvite, formatOrgPermission(), formatProjectPermission(), memberResourceState(), normalizeIdList() (+22 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (16): Secret, ACCOUNT_PROVIDERS, AccountFormSnapshot, AssociatedAccount, Project, accountsAPI, ProjectComponent, ProjectPermissionsResponse (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): logError(), sanitizeLogData(), SENSITIVE_PATTERNS

### Community 44 - "Community 44"
Cohesion: 0.14
Nodes (19): AuthenticatedLayout(), AuthenticatedLayoutProps, ProtectedRoute(), sidebarOffsetClass(), AuthContext, AuthContextType, useAuth(), User (+11 more)

### Community 45 - "Community 45"
Cohesion: 0.13
Nodes (25): canGrantOrgPermissions(), canGrantOrgRole(), canGrantProjectPermissions(), canInviteToOrganization(), canManageOrgMember(), canManageProjectMember(), canPerformOrgAction(), hasProjectCapability() (+17 more)

### Community 47 - "Community 47"
Cohesion: 0.24
Nodes (9): secretFilesAPI, countDiffChanges(), EnvDiffLine, EnvDiffType, mapServerDiffToLines(), ServerEnvDiff, SecretFileCompareModal(), SecretFileCompareModalProps (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.15
Nodes (17): ProjectCard(), ProjectCardProps, ProjectShell(), getProjectNav(), canAccessProjectMembers(), ProjectListItem, Avatar(), AvatarGroup() (+9 more)

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (15): displayFont, geistMono, geistSans, metadata, AuthProvider(), OrganizationProvider(), ToastContext, ToastContextType (+7 more)

### Community 50 - "Community 50"
Cohesion: 0.10
Nodes (29): authenticate(), AuthRequest, generateAccessToken(), generateToken(), getJWTSecret(), verifyToken(), requireAccountAccess(), requireComponentAccess() (+21 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (18): DEFAULT_ENVIRONMENTS, componentsAPI, formatEnvLabel(), clearLastEnvironment(), getLastEnvironment(), LastEnvMap, readMap(), scopeKey() (+10 more)

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (6): revokeApiTokensForUser(), ApiTokenScope, generateApiToken(), IProjectApiToken, ProjectApiToken, ProjectApiTokenSchema

## Knowledge Gaps
- **284 isolated node(s):** `name`, `version`, `description`, `type`, `main` (+279 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `Community 1` to `Community 32`, `Community 33`, `Community 34`, `Community 3`, `Community 8`, `Community 11`, `Community 44`, `Community 47`, `Community 48`, `Community 52`, `Community 21`, `Community 22`, `Community 24`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Community 32` to `Community 33`, `Community 34`, `Community 1`, `Community 3`, `Community 8`, `Community 11`, `Community 12`, `Community 48`, `Community 49`, `Community 22`, `Community 24`, `Community 31`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `useOrganization()` connect `Community 11` to `Community 32`, `Community 33`, `Community 44`, `Community 48`, `Community 24`, `Community 31`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `useToast()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useToast()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `useOrganization()` (e.g. with `ManageMembersPage()` and `OrganizationMembersPage()`) actually correct?**
  _`useOrganization()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useAuth()` (e.g. with `ProjectSettingsPage()` and `SettingsPage()`) actually correct?**
  _`useAuth()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _284 weakly-connected nodes found - possible documentation gaps or missing edges._