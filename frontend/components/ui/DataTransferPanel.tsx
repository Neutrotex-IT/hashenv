'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { Modal, ModalActions } from './Modal';
import { downloadJsonFile } from '@/lib/download';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { dataTransferAPI, DataTransferImportResult } from '@/lib/api';

interface DataTransferPanelProps {
  scope: 'project' | 'organization';
  projectId?: string;
  orgId?: string;
  canExport: boolean;
  canImport: boolean;
  resourceName: string;
}

function formatImportSummary(result: DataTransferImportResult, scope: 'project' | 'organization'): string {
  const { summary } = result;
  const parts = [
    `${summary.envFilesImported} env file(s)`,
    `${summary.secretsCreated + summary.secretsUpdated} secret(s) imported`,
    `${summary.accountsCreated + summary.accountsUpdated} account(s) imported`,
  ];

  if (scope === 'organization') {
    parts.push(`${summary.projectsCreated} project(s) created`);
    if (summary.projectsSkipped > 0) {
      parts.push(`${summary.projectsSkipped} project(s) skipped`);
    }
  }

  if (summary.environmentsAdded > 0) {
    parts.push(`${summary.environmentsAdded} environment(s) added`);
  }

  return parts.join(', ');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DataTransferPanel({
  scope,
  projectId,
  orgId,
  canExport,
  canImport,
  resourceName,
}: DataTransferPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const closeImportModal = useCallback(() => {
    setImportModalOpen(false);
    setSelectedFile(null);
    setFileError('');
    setOverwrite(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  useEffect(() => {
    if (!importModalOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !importing) closeImportModal();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [importModalOpen, importing, closeImportModal]);

  const handleExport = async () => {
    setExporting(true);
    setError('');
    setStatusMessage('');
    try {
      const data =
        scope === 'project'
          ? await dataTransferAPI.exportProject(projectId!)
          : await dataTransferAPI.exportOrganization(orgId!);

      const slug = resourceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      downloadJsonFile(data, `hashenv-${scope}-${slug || 'export'}-${Date.now()}.json`);
      setStatusMessage('Export downloaded.');
    } catch (err: unknown) {
      setError(await getApiErrorMessage(err, 'Failed to export data'));
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (file: File | undefined) => {
    if (!file) return;

    setFileError('');
    setSelectedFile(null);

    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setFileError('Please select a JSON file (.json).');
      return;
    }

    try {
      const text = await file.text();
      JSON.parse(text);
    } catch {
      setFileError('The selected file is not valid JSON.');
      return;
    }

    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setError('');
    setStatusMessage('');
    setImportWarnings([]);

    try {
      const result =
        scope === 'project'
          ? await dataTransferAPI.importProject(projectId!, selectedFile, { overwrite })
          : await dataTransferAPI.importOrganization(orgId!, selectedFile, { overwrite });

      closeImportModal();
      setStatusMessage(`Import complete: ${formatImportSummary(result, scope)}.`);
      if (result.warnings.length > 0) {
        setImportWarnings(result.warnings);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setFileError(axiosErr.response?.data?.error || 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  if (!canExport && !canImport) {
    return null;
  }

  const importTarget =
    scope === 'project'
      ? `project "${resourceName}"`
      : `organization "${resourceName}"`;

  return (
    <>
      <div className="content-section">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Export / Import</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Download all environment files, secrets, and associated accounts as JSON, or import the same
          format to restore data in bulk.
        </p>

        {error && (
          <div className="mt-6 mb-4 rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-3">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        {statusMessage && (
          <div className="mt-6 mb-4 rounded-[var(--radius-sm)] border border-green-500/30 bg-green-500/10 p-3">
            <p className="text-sm text-green-400">{statusMessage}</p>
          </div>
        )}

        {importWarnings.length > 0 && (
          <div className="mt-6 mb-4 rounded-[var(--radius-sm)] border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 max-h-40 overflow-y-auto">
            <p className="text-sm font-medium text-[var(--warning)] mb-2">Import warnings</p>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
              {importWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div
          className={`mt-6 grid gap-6 ${canExport && canImport ? 'sm:grid-cols-2' : ''}`}
        >
          {canExport && (
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[var(--foreground)] mb-1">Export</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Download a JSON backup of all data you can access in this {scope}.
              </p>
              <Button variant="outline" size="md" onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export JSON'}
              </Button>
            </div>
          )}

          {canImport && (
            <div
              className={`min-w-0 ${canExport ? 'sm:border-l sm:border-[var(--border)] sm:pl-8' : ''}`}
            >
              <h3 className="text-sm font-medium text-[var(--foreground)] mb-1">Import</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Restore data from a HashEnv JSON export. You can review options before importing.
              </p>
              <Button variant="secondary" size="md" onClick={() => setImportModalOpen(true)}>
                Import JSON
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={importModalOpen}
        onClose={closeImportModal}
        size="md"
        labelledBy="import-dialog-title"
        describedBy="import-dialog-description"
        closeOnBackdrop={!importing}
        closeOnEscape={!importing}
        zIndex={90}
      >
        <h3 id="import-dialog-title" className="text-lg font-semibold text-[var(--foreground)] mb-1">
          Import JSON
        </h3>
        <p id="import-dialog-description" className="text-sm text-[var(--text-muted)] mb-5">
          Import data into {importTarget}. Choose a file, set import options, then confirm.
        </p>

        <div className="space-y-5">
          <div>
            <label htmlFor="import-json-file" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Backup file
            </label>
            <input
              ref={fileInputRef}
              id="import-json-file"
              type="file"
              accept="application/json,.json"
              disabled={importing}
              onChange={(e) => {
                void handleFileSelect(e.target.files?.[0]);
              }}
              className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--accent-hover)] file:cursor-pointer disabled:opacity-50"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-[var(--text-secondary)] break-all">
                Selected:{' '}
                <span className="font-medium text-[var(--foreground)]">{selectedFile.name}</span>{' '}
                ({formatFileSize(selectedFile.size)})
              </p>
            )}
            {fileError && (
              <p className="mt-2 text-sm text-[var(--error)]">{fileError}</p>
            )}
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={overwrite}
                disabled={importing}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--foreground)]">
                  Overwrite existing secrets and accounts
                </span>
                <span className="block text-sm text-[var(--text-muted)] mt-1">
                  {overwrite
                    ? 'Matching secrets and accounts will be replaced with values from the import file.'
                    : 'Existing secrets and accounts with the same name will be left unchanged.'}
                </span>
              </span>
            </label>
          </div>
        </div>

        <ModalActions className="mt-6">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={closeImportModal}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => void handleImport()}
            disabled={!selectedFile || importing}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
