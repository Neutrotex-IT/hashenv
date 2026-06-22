import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { assertBlobDownloadResponse, getApiErrorMessage } from './apiErrors';
import { downloadTextFile } from './download';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// In-memory token storage (never persisted to localStorage)
let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
let forbiddenHandler: (() => void) | null = null;
let forbiddenRefreshScheduled = false;

export function setForbiddenHandler(handler: (() => void) | null): void {
  forbiddenHandler = handler;
}

function notifyForbidden(): void {
  if (!forbiddenHandler || forbiddenRefreshScheduled) {
    return;
  }
  forbiddenRefreshScheduled = true;
  queueMicrotask(() => {
    forbiddenRefreshScheduled = false;
    forbiddenHandler?.();
  });
}

// Token management functions
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

// Subscribe to token refresh
function subscribeToTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

// Notify all subscribers when token is refreshed
function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle auth errors with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // If 401 and not already retrying, attempt to refresh the token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Skip refresh for auth endpoints to avoid infinite loops
      if (originalRequest.url?.includes('/auth/login') || 
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }
      
      if (isRefreshing) {
        // Wait for the refresh to complete
        return new Promise((resolve) => {
          subscribeToTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const response = await api.post('/auth/refresh');
        const newAccessToken = response.data.accessToken;
        
        setAccessToken(newAccessToken);
        onTokenRefreshed(newAccessToken);
        isRefreshing = false;
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        clearAccessToken();
        
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    // 403 errors (forbidden) are handled by components - don't redirect
    // These indicate access control restrictions, not authentication issues
    if (error.response?.status === 403) {
      notifyForbidden();
    }
    return Promise.reject(error);
  }
);

export default api;

async function fetchAndDownloadBlob(
  url: string,
  filename: string,
  fallbackError: string
): Promise<void> {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    await assertBlobDownloadResponse(response, fallbackError);
    downloadTextFile(await response.data.text(), filename);
  } catch (error) {
    throw new Error(await getApiErrorMessage(error, fallbackError));
  }
}

// Types
export interface Organization {
  _id: string;
  name: string;
  slug: string;
  type: 'personal' | 'team';
  createdBy: string;
  role: 'owner' | 'admin' | 'member';
  permissions?: string[];
  createdAt: string;
}

export interface PanicButtonSettings {
  flushEnvs: boolean;
  flushSecrets: boolean;
  revokeApiTokens: boolean;
  revokeCollaborators: boolean;
  downloadEnvs: boolean;
  askConfirmation: boolean;
}

export interface OrganizationSettingsResponse {
  panicButton: PanicButtonSettings;
  canConfigure: boolean;
  canExecute: boolean;
  eligibleProjectCount: number;
}

export interface OrgMember {
  id: string;
  user: {
    _id: string;
    name: string;
    username: string;
    email: string;
  };
  role: 'owner' | 'admin' | 'member';
  permissions?: string[];
  createdAt: string;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: 'member' | 'admin';
  permissions?: string[];
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  invitedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface ProjectInvite {
  id: string;
  email: string;
  permission: 'read' | 'write';
  permissions?: string[];
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  invitedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface AuditLogEntry {
  _id: string;
  organizationId?: string;
  projectId?: string;
  resourceType: 'env' | 'secret' | 'account' | 'project' | 'org' | 'member' | 'session' | 'api_token' | 'panic';
  resourceId?: string;
  action: string;
  actorType: 'user' | 'api_token';
  actorId: string;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface OrgPermissionsResponse {
  catalog: {
    org: Record<string, string>;
    roleDefaults: Record<string, string[]>;
  };
  effective: string[];
  grantable: string[];
}

export interface ProjectPermissionsResponse {
  catalog: {
    project: Record<string, string>;
  };
  effective: string[];
  grantable: string[];
}

export interface InvitePreview {
  type: 'organization' | 'project';
  email: string;
  role?: 'member' | 'admin';
  permission?: 'read' | 'write';
  status: 'pending' | 'accepted' | 'revoked';
  expired: boolean;
  organization: {
    _id: string;
    name: string;
    slug: string;
    type: 'personal' | 'team';
  } | null;
  project?: {
    _id: string;
    name: string;
  } | null;
  requiresRegistration: boolean;
  canAccept: boolean;
}

// Auth API
export const authAPI = {
  register: async (data: { name: string; username: string; email: string; password: string; inviteToken?: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    // Store access token in memory
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  },
  refresh: async () => {
    const response = await api.post('/auth/refresh');
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAccessToken();
    }
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  verifyEmail: async (token: string) => {
    const response = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    return response.data;
  },
  resendVerification: async (email: string) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },
  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
};

// Organizations API
export const organizationsAPI = {
  list: async (): Promise<Organization[]> => {
    const response = await api.get('/organizations');
    return response.data;
  },
  get: async (orgId: string): Promise<Organization> => {
    const response = await api.get(`/organizations/${orgId}`);
    return response.data;
  },
  create: async (data: { name: string; slug: string }): Promise<Organization> => {
    const response = await api.post('/organizations', data);
    return response.data;
  },
  update: async (orgId: string, data: { name?: string }): Promise<Organization> => {
    const response = await api.patch(`/organizations/${orgId}`, data);
    return response.data;
  },
  getMembers: async (orgId: string): Promise<OrgMember[]> => {
    const response = await api.get(`/organizations/${orgId}/members`);
    return response.data;
  },
  getPermissions: async (orgId: string): Promise<OrgPermissionsResponse> => {
    const response = await api.get(`/organizations/${orgId}/permissions`);
    return response.data;
  },
  inviteMember: async (
    orgId: string,
    data: { email: string; role: 'member' | 'admin'; permissions?: string[] }
  ): Promise<OrgInvite> => {
    const response = await api.post(`/organizations/${orgId}/members`, data);
    return response.data;
  },
  getInvites: async (orgId: string): Promise<OrgInvite[]> => {
    const response = await api.get(`/organizations/${orgId}/invites`);
    return response.data;
  },
  revokeInvite: async (orgId: string, inviteId: string): Promise<void> => {
    await api.delete(`/organizations/${orgId}/invites/${inviteId}`);
  },
  resendInvite: async (orgId: string, inviteId: string): Promise<OrgInvite> => {
    const response = await api.post(`/organizations/${orgId}/invites/${inviteId}/resend`);
    return response.data;
  },
  updateMember: async (
    orgId: string,
    memberId: string,
    data: { role?: 'member' | 'admin'; permissions?: string[] }
  ): Promise<OrgMember> => {
    const response = await api.patch(`/organizations/${orgId}/members/${memberId}`, data);
    return response.data;
  },
  removeMember: async (orgId: string, memberId: string): Promise<void> => {
    await api.delete(`/organizations/${orgId}/members/${memberId}`);
  },
  getAudit: async (orgId: string): Promise<AuditLogEntry[]> => {
    const response = await api.get(`/organizations/${orgId}/audit`);
    return response.data;
  },
  getSettings: async (orgId: string): Promise<OrganizationSettingsResponse> => {
    const response = await api.get(`/organizations/${orgId}/settings`);
    return response.data;
  },
  updateSettings: async (
    orgId: string,
    data: { panicButton: Partial<PanicButtonSettings> }
  ): Promise<{ panicButton: PanicButtonSettings }> => {
    const response = await api.put(`/organizations/${orgId}/settings`, data);
    return response.data;
  },
  panic: async (orgId: string, password: string) => {
    const response = await api.post(`/organizations/${orgId}/panic`, { password });
    return response.data;
  },
};

// Invites API
export const invitesAPI = {
  preview: async (token: string): Promise<InvitePreview> => {
    const response = await api.get(`/invites/preview?token=${encodeURIComponent(token)}`);
    return response.data;
  },
  accept: async (token: string) => {
    const response = await api.post('/invites/accept', { token });
    return response.data;
  },
};

// Projects API
export const projectsAPI = {
  list: async (orgId?: string) => {
    const params = orgId ? `?orgId=${orgId}` : '';
    const response = await api.get(`/projects${params}`);
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },
  getPermissions: async (projectId: string): Promise<ProjectPermissionsResponse> => {
    const response = await api.get(`/projects/${projectId}/permissions`);
    return response.data;
  },
  create: async (data: { name: string; organizationId: string }) => {
    const response = await api.post('/projects', data);
    return response.data;
  },
  addMember: async (
    projectId: string,
    data: { userId: string; permission: 'read' | 'write'; permissions?: string[] }
  ) => {
    const response = await api.post(`/projects/${projectId}/members`, data);
    return response.data;
  },
  inviteMember: async (
    projectId: string,
    data: { email: string; permission: 'read' | 'write'; permissions?: string[] }
  ): Promise<ProjectInvite> => {
    const response = await api.post(`/projects/${projectId}/invites`, data);
    return response.data;
  },
  getInvites: async (projectId: string): Promise<ProjectInvite[]> => {
    const response = await api.get(`/projects/${projectId}/invites`);
    return response.data;
  },
  revokeInvite: async (projectId: string, inviteId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/invites/${inviteId}`);
  },
  resendInvite: async (projectId: string, inviteId: string): Promise<ProjectInvite> => {
    const response = await api.post(`/projects/${projectId}/invites/${inviteId}/resend`);
    return response.data;
  },
  removeMember: async (projectId: string, userId: string) => {
    const response = await api.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  },
  updateMember: async (
    projectId: string,
    userId: string,
    data: { permission?: 'read' | 'write'; permissions?: string[] }
  ) => {
    const response = await api.patch(`/projects/${projectId}/members/${userId}`, data);
    return response.data;
  },
  update: async (projectId: string, data: { name: string }) => {
    const response = await api.patch(`/projects/${projectId}`, data);
    return response.data;
  },
  delete: async (projectId: string) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },
  getActivity: async (
    projectId: string,
    options?: { environment?: string; resourceType?: string }
  ) => {
    const params = new URLSearchParams();
    if (options?.environment) params.set('environment', options.environment);
    if (options?.resourceType) params.set('resourceType', options.resourceType);
    const qs = params.toString();
    const response = await api.get(`/projects/${projectId}/activity${qs ? `?${qs}` : ''}`);
    return response.data;
  },
  searchUsers: async (orgId: string, query: string, limit: number = 10) => {
    const params = new URLSearchParams({ orgId, limit: limit.toString() });
    if (query && query.trim().length > 0) {
      params.append('q', query);
    }
    const response = await api.get(`/projects/users/search?${params.toString()}`);
    return response.data;
  },
};

// Env Files API
export const envAPI = {
  upload: async (projectId: string, file: File, environment: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('environment', environment);
    
    const response = await api.post(`/projects/${projectId}/env`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  uploadText: async (projectId: string, content: string, environment: string) => {
    const response = await api.post(`/projects/${projectId}/env`, {
      content,
      environment,
    });
    return response.data;
  },
  download: async (projectId: string, environment: string, version?: number) => {
    const params = new URLSearchParams({ environment });
    if (version) {
      params.append('version', version.toString());
    }

    await fetchAndDownloadBlob(
      `/projects/${projectId}/env?${params.toString()}`,
      '.env',
      'Failed to download environment file'
    );
  },
  edit: async (
    projectId: string,
    envFileId: string,
    content: string,
    options?: { saveAsNewVersion?: boolean }
  ) => {
    const saveAsNewVersion = options?.saveAsNewVersion === true;
    const url = `/projects/${projectId}/env/${envFileId}${
      saveAsNewVersion ? '?saveAsNewVersion=true' : ''
    }`;
    const response = await api.put(url, {
      content,
      saveAsNewVersion,
    });
    return response.data;
  },
  delete: async (projectId: string, envFileId: string) => {
    const response = await api.delete(`/projects/${projectId}/env/${envFileId}`);
    return response.data;
  },
  listVersions: async (projectId: string, environment?: string) => {
    const params = new URLSearchParams();
    if (environment) {
      params.set('environment', environment);
    }
    const query = params.toString();
    const response = await api.get(`/projects/${projectId}/env/versions${query ? `?${query}` : ''}`);
    return response.data;
  },
  getFileContent: async (projectId: string, envFileId: string) => {
    const response = await api.get(`/projects/${projectId}/env/${envFileId}/content`);
    return response.data;
  },
  getLogs: async (projectId: string, environment?: string) => {
    const params = environment ? new URLSearchParams({ environment }) : '';
    const response = await api.get(`/projects/${projectId}/env/logs${params ? `?${params}` : ''}`);
    return response.data;
  },
  rollback: async (projectId: string, environment: string, version: number) => {
    const response = await api.post(`/projects/${projectId}/env/rollback`, { environment, version });
    return response.data;
  },
  diff: async (projectId: string, environment: string, from: number, to: number) => {
    const params = new URLSearchParams({
      environment,
      from: String(from),
      to: String(to),
    });
    const response = await api.get(`/projects/${projectId}/env/diff?${params}`);
    return response.data as {
      added: Array<{ key: string; newValue?: string }>;
      removed: Array<{ key: string; oldValue?: string }>;
      changed: Array<{ key: string; oldValue: string; newValue: string }>;
      unchanged: Array<{ key: string; oldValue: string; newValue: string }>;
    };
  },
  downloadLogs: async (projectId: string, environment?: string) => {
    const params = environment ? new URLSearchParams({ environment }) : '';
    await fetchAndDownloadBlob(
      `/projects/${projectId}/env/logs/download${params ? `?${params}` : ''}`,
      `hashenv-logs-${Date.now()}.txt`,
      'Failed to download activity logs'
    );
  },
};

export interface ProjectEnvironment {
  slug: string;
  hasFiles: boolean;
  latestVersion: number | null;
  updatedAt: string | null;
  versionCount: number;
}

export const environmentsAPI = {
  list: async (projectId: string): Promise<ProjectEnvironment[]> => {
    const response = await api.get(`/projects/${projectId}/environments`);
    return response.data;
  },
  create: async (projectId: string, name: string): Promise<ProjectEnvironment> => {
    const response = await api.post(`/projects/${projectId}/environments`, { name });
    return response.data;
  },
  rename: async (projectId: string, slug: string, name: string): Promise<ProjectEnvironment> => {
    const response = await api.patch(`/projects/${projectId}/environments/${slug}`, { name });
    return response.data;
  },
  delete: async (projectId: string, slug: string, force = false): Promise<void> => {
    const params = force ? '?force=true' : '';
    await api.delete(`/projects/${projectId}/environments/${slug}${params}`);
  },
};

// Secrets API
export const secretsAPI = {
  list: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/secrets`);
    return response.data;
  },
  get: async (projectId: string, secretId: string) => {
    const response = await api.get(`/projects/${projectId}/secrets/${secretId}/content`);
    return response.data;
  },
  create: async (projectId: string, data: { name: string; content: string }) => {
    const response = await api.post(`/projects/${projectId}/secrets`, data);
    return response.data;
  },
  update: async (projectId: string, secretId: string, data: { name?: string; content?: string }) => {
    const response = await api.put(`/projects/${projectId}/secrets/${secretId}`, data);
    return response.data;
  },
  delete: async (projectId: string, secretId: string) => {
    const response = await api.delete(`/projects/${projectId}/secrets/${secretId}`);
    return response.data;
  },
};

// Associated Accounts API
export const accountsAPI = {
  list: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/accounts`);
    return response.data;
  },
  getCredentials: async (projectId: string, accountId: string) => {
    const response = await api.get(`/projects/${projectId}/accounts/${accountId}/credentials`);
    return response.data;
  },
  create: async (
    projectId: string,
    data: {
      label: string;
      provider: string;
      providerOther?: string;
      email: string;
      loginUrl?: string;
      usesSSO: boolean;
      ssoProvider?: string;
      password?: string;
      notes?: string;
    }
  ) => {
    const response = await api.post(`/projects/${projectId}/accounts`, data);
    return response.data;
  },
  update: async (
    projectId: string,
    accountId: string,
    data: {
      label?: string;
      provider?: string;
      providerOther?: string;
      email?: string;
      loginUrl?: string;
      usesSSO?: boolean;
      ssoProvider?: string;
      password?: string;
      notes?: string;
    }
  ) => {
    const response = await api.put(`/projects/${projectId}/accounts/${accountId}`, data);
    return response.data;
  },
  delete: async (projectId: string, accountId: string) => {
    const response = await api.delete(`/projects/${projectId}/accounts/${accountId}`);
    return response.data;
  },
};

// API Tokens API
export interface ApiToken {
  _id: string;
  name: string;
  tokenPrefix: string;
  scopes: ('read' | 'write')[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: {
    _id: string;
    name: string;
    username: string;
    email: string;
  };
  createdAt: string;
}

export interface CreateApiTokenResponse extends ApiToken {
  token: string; // Only returned on creation
}

export const apiTokensAPI = {
  list: async (projectId: string): Promise<ApiToken[]> => {
    const response = await api.get(`/projects/${projectId}/tokens`);
    return response.data;
  },
  create: async (
    projectId: string,
    data: { name: string; scopes?: ('read' | 'write')[]; expiresIn?: number }
  ): Promise<CreateApiTokenResponse> => {
    const response = await api.post(`/projects/${projectId}/tokens`, data);
    return response.data;
  },
  update: async (
    projectId: string,
    tokenId: string,
    data: { name?: string; scopes?: ('read' | 'write')[] }
  ): Promise<ApiToken> => {
    const response = await api.patch(`/projects/${projectId}/tokens/${tokenId}`, data);
    return response.data;
  },
  delete: async (projectId: string, tokenId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/tokens/${tokenId}`);
  },
};

export interface DataTransferSummary {
  envFilesImported: number;
  secretsCreated: number;
  secretsUpdated: number;
  secretsSkipped: number;
  accountsCreated: number;
  accountsUpdated: number;
  accountsSkipped: number;
  environmentsAdded: number;
  projectsCreated: number;
  projectsUpdated: number;
  projectsSkipped: number;
}

export interface DataTransferImportResult {
  success: boolean;
  summary: DataTransferSummary;
  warnings: string[];
}

// Data export / import API
export const dataTransferAPI = {
  exportProject: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/export`);
    return response.data;
  },
  importProject: async (projectId: string, file: File, options?: { overwrite?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.overwrite) {
      formData.append('overwrite', 'true');
    }
    const response = await api.post(`/projects/${projectId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as DataTransferImportResult;
  },
  exportOrganization: async (orgId: string) => {
    const response = await api.get(`/organizations/${orgId}/export`);
    return response.data;
  },
  importOrganization: async (orgId: string, file: File, options?: { overwrite?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.overwrite) {
      formData.append('overwrite', 'true');
    }
    const response = await api.post(`/organizations/${orgId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as DataTransferImportResult;
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    const response = await api.get('/settings');
    return response.data;
  },
  update: async (data: { flushDuration?: number | null }) => {
    const response = await api.put('/settings', data);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/settings/profile');
    return response.data;
  },
  updateProfile: async (data: { name?: string; username?: string }) => {
    const response = await api.put('/settings/profile', data);
    return response.data;
  },
};
