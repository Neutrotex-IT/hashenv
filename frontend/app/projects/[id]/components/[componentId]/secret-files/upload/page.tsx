'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { secretFilesAPI, componentsAPI } from '@/lib/api';
import { formatEnvLabel } from '@/lib/environments';
import { getLastEnvironment, setLastEnvironment } from '@/lib/lastEnvironment';
import {
  defaultFileNameForType,
  formatSecretFileType,
  inferSecretFileType,
  isAllowedFileUploadName,
  isAllowedPasteFileName,
} from '@/lib/secretFiles';
import { Button } from '@/components/ui/Button';
import { SecretFileUploadDropArea } from '@/components/ui/SecretFileUploadDropArea';
import { useProjectEnvironments } from '@/hooks/queries/useProjectEnvironments';
import { useProject } from '@/hooks/queries/useProject';

const componentHref = (projectId: string, componentId: string) =>
  `/projects/${projectId}/components/${componentId}`;

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

  const [environment, setEnvironment] = useState('dev');
  const [fileType, setFileType] = useState('env');
  const [fileName, setFileName] = useState('.env');
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text'>('file');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    componentsAPI.get(projectId, componentId).then((c) => setComponentName(c.name)).catch(() => {});
  }, [projectId, componentId]);

  useEffect(() => {
    if (envParam && envOptions.includes(envParam)) {
      setEnvironment(envParam);
      setLastEnvironment(projectId, componentId, envParam);
      return;
    }

    const saved = getLastEnvironment(projectId, componentId);
    if (saved && envOptions.includes(saved)) {
      setEnvironment(saved);
      return;
    }

    setEnvironment(envOptions[0] ?? 'dev');
  }, [envParam, envOptions, projectId, componentId]);

  const syncEnvironmentUrl = useCallback(
    (nextEnv: string) => {
      setLastEnvironment(projectId, componentId, nextEnv);
      router.replace(
        `/projects/${projectId}/components/${componentId}/secret-files/upload?environment=${encodeURIComponent(nextEnv)}`
      );
    },
    [router, projectId, componentId]
  );

  const applyFileSelection = useCallback((selectedFile: File, selectedName: string, selectedType: string) => {
    setFile(selectedFile);
    setFileName(selectedName);
    setFileType(selectedType);
    setUploadMethod('file');
    setError('');
    setInfo('');
  }, []);

  const handleFileSelect = useCallback(
    ({ file: selectedFile, fileName: selectedName, fileType: selectedType }: {
      file: File;
      fileName: string;
      fileType: string;
    }) => {
      applyFileSelection(selectedFile, selectedName, selectedType);
    },
    [applyFileSelection]
  );

  const handleUnsupportedFile = useCallback(
    (selectedFile: File, message: string) => {
      setUploadMethod('text');
      setFile(null);
      setError('');
      setInfo(message);

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (text.length > 50 * 1024) {
          setError('Content size must be less than 50KB');
          return;
        }
        setContent(text);
        const baseName = selectedFile.name.includes('.')
          ? selectedFile.name.slice(0, selectedFile.name.lastIndexOf('.'))
          : selectedFile.name;
        setFileName(`${baseName}.txt`);
        setFileType('custom');
      };
      reader.onerror = () => {
        setError('Could not read file. Paste the content manually.');
      };
      reader.readAsText(selectedFile);
    },
    []
  );

  const handleFileNameChange = (value: string) => {
    setFileName(value);
    setFileType(inferSecretFileType(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedFileName = fileName.trim();

    if (!resolvedFileName) {
      setError('File name is required');
      return;
    }

    const nameAllowed =
      uploadMethod === 'file'
        ? isAllowedFileUploadName(resolvedFileName)
        : isAllowedPasteFileName(resolvedFileName);

    if (!nameAllowed) {
      setError(
        uploadMethod === 'file'
          ? 'Invalid file name for upload'
          : 'Enter a valid file name with extension (e.g. secrets.txt, config.custom)'
      );
      return;
    }

    if (uploadMethod === 'file' && !file) {
      setError('Please select or drop a file');
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
      setLastEnvironment(projectId, componentId, environment);
      router.push(`${componentHref(projectId, componentId)}?environment=${encodeURIComponent(environment)}`);
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
          href={componentHref(projectId, componentId)}
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

      {info && (
        <div className="mb-6 rounded-[var(--radius-sm)] border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-4">
          <p className="text-sm text-[var(--warning)]">{info}</p>
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
            onChange={(e) => {
              const nextEnv = e.target.value;
              setEnvironment(nextEnv);
              syncEnvironmentUrl(nextEnv);
            }}
            className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            {envOptions.map((slug) => (
              <option key={slug} value={slug}>
                {formatEnvLabel(slug)} ({slug})
              </option>
            ))}
          </select>
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
                  setInfo('');
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
                  setInfo('');
                  if (!fileName.trim()) {
                    setFileName(defaultFileNameForType('custom'));
                    setFileType('custom');
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm text-[var(--text-secondary)]">Paste Content</span>
            </label>
          </div>

          {uploadMethod === 'file' ? (
            <div className="space-y-4">
              <SecretFileUploadDropArea
                onFileSelect={handleFileSelect}
                onUnsupportedFile={handleUnsupportedFile}
                disabled={loading}
              />
              {file && (
                <p className="text-sm text-[var(--text-muted)]">
                  Selected: <span className="font-medium text-[var(--foreground)]">{file.name}</span> (
                  {(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-muted)]">
                Use this for unsupported extensions or custom formats. Set the file name and extension below — it will be
                preserved when downloading.
              </p>
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
              <p className="text-xs text-[var(--text-muted)]">
                {(content.length / 1024).toFixed(2)} KB / 50 KB maximum
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fileName" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              File Name
            </label>
            <input
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => handleFileNameChange(e.target.value)}
              readOnly={uploadMethod === 'file' && Boolean(file)}
              className={`block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono text-sm ${
                uploadMethod === 'file' && file ? 'opacity-80' : ''
              }`}
              required
            />
            {uploadMethod === 'text' && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Include the extension (e.g. <code className="font-mono">app.config</code>,{' '}
                <code className="font-mono">secrets.txt</code>)
              </p>
            )}
          </div>
          <div>
            <label htmlFor="fileType" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Detected Type
            </label>
            <div
              id="fileType"
              className="block w-full rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text-secondary)]"
            >
              {formatSecretFileType(fileType)}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-4">
          <p className="text-sm text-[var(--warning)]">
            <strong>Security Notice:</strong> Your secrets file will be encrypted before storage.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button variant="outline" size="md" asLink href={componentHref(projectId, componentId)}>
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
