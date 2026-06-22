'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { envAPI, environmentsAPI } from '@/lib/api';
import { formatEnvLabel } from '@/lib/environments';
import { Button } from '@/components/ui/Button';

export default function UploadEnvPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text'>('file');
  const [environment, setEnvironment] = useState(searchParams.get('environment') || 'dev');
  const [envOptions, setEnvOptions] = useState<string[]>(['dev', 'staging', 'prod']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    environmentsAPI.list(projectId).then((envs) => {
      const slugs = envs.map((e) => e.slug);
      if (slugs.length > 0) {
        setEnvOptions(slugs);
        const envParam = searchParams.get('environment');
        if (envParam && slugs.includes(envParam)) {
          setEnvironment(envParam);
        } else if (!slugs.includes(environment)) {
          setEnvironment(slugs[0]);
        }
      }
    }).catch(() => {});
  }, [projectId, searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (50KB limit)
      if (selectedFile.size > 50 * 1024) {
        setError('File size must be less than 50KB');
        return;
      }
      // Validate filename
      if (!selectedFile.name.endsWith('.env') && selectedFile.name !== '.env') {
        setError('Only .env files are allowed');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadMethod === 'file' && !file) {
      setError('Please select a file');
      return;
    }
    
    if (uploadMethod === 'text' && !content.trim()) {
      setError('Please enter environment file content');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (uploadMethod === 'file' && file) {
        await envAPI.upload(projectId, file, environment);
      } else if (uploadMethod === 'text' && content) {
        await envAPI.uploadText(projectId, content, environment);
      }
      router.push(`/projects/${projectId}?environment=${encodeURIComponent(environment)}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Upload Environment File</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Upload a new version of your .env file</p>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
                <p className="text-sm text-[var(--error)]">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
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

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Upload Method
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="file"
                      checked={uploadMethod === 'file'}
                      onChange={(e) => {
                        setUploadMethod(e.target.value as 'file');
                        setFile(null);
                        setContent('');
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
                      onChange={(e) => {
                        setUploadMethod(e.target.value as 'text');
                        setFile(null);
                        setContent('');
                        setError('');
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">Paste Content</span>
                  </label>
                </div>

                {uploadMethod === 'file' ? (
                  <div>
                    <label htmlFor="file" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      .env File
                    </label>
                    <input
                      id="file"
                      type="file"
                      accept=".env"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--accent-hover)] file:cursor-pointer"
                    />
                    {file && (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        Selected: <span className="font-medium text-[var(--foreground)]">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Maximum file size: 50KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Environment File Content
                    </label>
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
                      placeholder="Paste your .env file content here...&#10;&#10;Example:&#10;DATABASE_URL=postgresql://...&#10;API_KEY=your_api_key_here&#10;NODE_ENV=production"
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
                  <strong>Security Notice:</strong> Your .env file will be encrypted before storage.
                  Only authorized users with read access can download and decrypt this file.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <Button
                  variant="outline"
                  size="md"
                  asLink
                  href={`/projects/${projectId}`}
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
