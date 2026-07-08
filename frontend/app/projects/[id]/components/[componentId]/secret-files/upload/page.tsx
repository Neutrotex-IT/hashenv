'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { secretFilesAPI, componentsAPI } from '@/lib/api';
import { formatEnvLabel } from '@/lib/environments';
import {
  SECRET_FILE_TYPE_OPTIONS,
  defaultFileNameForType,
  inferSecretFileType,
  isAllowedSecretFileName,
} from '@/lib/secretFiles';
import { Button } from '@/components/ui/Button';
import { useProjectEnvironments } from '@/hooks/queries/useProjectEnvironments';
import { useProject } from '@/hooks/queries/useProject';

const PENDING_UPLOAD_KEY = (projectId: string, componentId: string) =>
  `hashenv-pending-upload-${projectId}-${componentId}`;

export default function UploadSecretFilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const componentId = params.componentId as string;
  const { data: project } = useProject(projectId);
  const { data: environments = [] } = useProjectEnvironments(projectId);
  const [componentName, setComponentName] = useState('');

  const envOptions = useMemo(
    () => (environments.length > 0 ? environments.map((e) => e.slug) : ['dev', 'staging', 'prod']),
    [environments]
  );

  const envParam = searchParams.get('environment');
  const fileNameParam = searchParams.get('fileName');
  const fileTypeParam = searchParams.get('fileType');

  const [environment, setEnvironment] = useState('dev');
  const [fileType, setFileType] = useState(fileTypeParam || 'env');
  const [fileName, setFileName] = useState(fileNameParam || defaultFileNameForType(fileTypeParam || 'env', fileNameParam ?? undefined));
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text'>('file');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    componentsAPI.get(projectId, componentId).then((c) => setComponentName(c.name)).catch(() => {});
  }, [projectId, componentId]);

  useEffect(() => {
    if (envParam && envOptions.includes(envParam)) {
      setEnvironment(envParam);
    } else {
      setEnvironment((current) => (envOptions.includes(current) ? current : envOptions[0] ?? 'dev'));
    }
  }, [envParam, envOptions]);

  useEffect(() => {
    if (fileTypeParam) setFileType(fileTypeParam);
    if (fileNameParam) setFileName(fileNameParam);
  }, [fileTypeParam, fileNameParam]);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_UPLOAD_KEY(projectId, componentId));
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { fileName?: string; fileType?: string; content?: string };
      if (pending.fileName) setFileName(pending.fileName);
      if (pending.fileType) setFileType(pending.fileType);
      if (pending.content) {
        setContent(pending.content);
        setUploadMethod('text');
      }
      sessionStorage.removeItem(PENDING_UPLOAD_KEY(projectId, componentId));
    } catch {
      sessionStorage.removeItem(PENDING_UPLOAD_KEY(projectId, componentId));
    }
  }, [projectId, componentId]);

  useEffect(() => {
    if (!fileNameParam) {
      setFileName(defaultFileNameForType(fileType));
    }
  }, [fileType, fileNameParam]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 50 * 1024) {
      setError('File size must be less than 50KB');
      return;
    }
    if (!isAllowedSecretFileName(selectedFile.name)) {
      setError('Unsupported secrets file type');
      return;
    }
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileType(inferSecretFileType(selectedFile.name));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedFileName = fileName.trim() || defaultFileNameForType(fileType);

    if (uploadMethod === 'file' && !file) {
      setError('Please select a file');
      return;
    }
    if (uploadMethod === 'text' && !content.trim()) {
      setError('Please enter secrets file content');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (uploadMethod === 'file' && file) {
        await secretFilesAPI.upload(projectId, componentId, file, environment, resolvedFileName, fileType);
      } else {
        await secretFilesAPI.uploadText(
          projectId,
          componentId,
          content,
          environment,
          resolvedFileName,
          fileType
        );
      }
      router.push(
        `/projects/${projectId}/components/${componentId}?environment=${encodeURIComponent(environment)}`
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to upload secrets file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/components/${componentId}?environment=${encodeURIComponent(environment)}`}
          className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] inline-block mb-4"
        >
          ← Back to {componentName || 'Component'}
        </Link>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Upload Secrets File</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Upload a new version for {project?.name ? `${project.name} · ` : ''}{componentName || 'this component'}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="environment" className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Environment
          </label>
          <select
            id="environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            {envOptions.map((slug) => (
              <option key={slug} value={slug}>
                {formatEnvLabel(slug)} ({slug})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fileType" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              File Type
            </label>
            <select
              id="fileType"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              {SECRET_FILE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fileName" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              File Name
            </label>
            <input
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Upload Method</label>
          <div className="flex gap-4 mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="file"
                checked={uploadMethod === 'file'}
                onChange={() => {
                  setUploadMethod('file');
                  setError('');
                }}
                className="mr-2"
              />
              <span className="text-sm text-[var(--text-secondary)]">Upload File</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="text"
                checked={uploadMethod === 'text'}
                onChange={() => {
                  setUploadMethod('text');
                  setFile(null);
                  setError('');
                }}
                className="mr-2"
              />
              <span className="text-sm text-[var(--text-secondary)]">Paste Content</span>
            </label>
          </div>

          {uploadMethod === 'file' ? (
            <div>
              <input
                id="file"
                type="file"
                accept=".env,.json,.yaml,.yml,.properties,.secrets,.pem,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--accent-hover)] file:cursor-pointer"
              />
              {file && (
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Selected: <span className="font-medium text-[var(--foreground)]">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          ) : (
            <div>
              <textarea
                id="content"
                value={content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  if (newContent.length > 50 * 1024) {
                    setError('Content size must be less than 50KB');
                    return;
                  }
                  setContent(newContent);
                  setError('');
                }}
                placeholder="Paste your secrets file content here..."
                rows={12}
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] font-mono text-sm placeholder:text-[var(--text-muted)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {(content.length / 1024).toFixed(2)} KB / 50 KB maximum
              </p>
            </div>
          )}
        </div>

        <div className="rounded-md border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-4">
          <p className="text-sm text-[var(--warning)]">
            <strong>Security Notice:</strong> Your secrets file will be encrypted before storage.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button
            variant="outline"
            size="md"
            asLink
            href={`/projects/${projectId}/components/${componentId}?environment=${encodeURIComponent(environment)}`}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={loading || (uploadMethod === 'file' && !file) || (uploadMethod === 'text' && !content.trim())}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </form>
    </div>
  );
}
