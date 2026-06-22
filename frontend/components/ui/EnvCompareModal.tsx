'use client';

import { useEffect, useState } from 'react';
import { envAPI } from '@/lib/api';
import { countDiffChanges, EnvDiffLine, mapServerDiffToLines } from '@/lib/envDiff';
import { Button } from './Button';
import { Modal } from './Modal';

interface EnvVersionOption {
  _id: string;
  version: number;
}

interface EnvCompareModalProps {
  projectId: string;
  environment: string;
  versions: EnvVersionOption[];
  initialFromVersion?: number;
  initialToVersion?: number;
  onClose: () => void;
}

export function EnvCompareModal({
  projectId,
  environment,
  versions,
  initialFromVersion,
  initialToVersion,
  onClose,
}: EnvCompareModalProps) {
  const sorted = [...versions].sort((a, b) => a.version - b.version);
  const [fromVersion, setFromVersion] = useState(
    initialFromVersion ?? (sorted.length > 1 ? sorted[sorted.length - 2].version : sorted[0]?.version ?? 1)
  );
  const [toVersion, setToVersion] = useState(
    initialToVersion ?? (sorted.length > 0 ? sorted[sorted.length - 1].version : 1)
  );
  const [diffLines, setDiffLines] = useState<EnvDiffLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hideUnchanged, setHideUnchanged] = useState(true);

  const fromFile = versions.find((v) => v.version === fromVersion);
  const toFile = versions.find((v) => v.version === toVersion);

  useEffect(() => {
    if (!fromFile || !toFile || fromVersion === toVersion) {
      setDiffLines([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const serverDiff = await envAPI.diff(projectId, environment, fromVersion, toVersion);
        if (!cancelled) {
          setDiffLines(mapServerDiffToLines(serverDiff));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const axiosErr = err as { response?: { data?: { error?: string } } };
          setError(axiosErr.response?.data?.error || 'Failed to load versions for comparison');
          setDiffLines([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [projectId, environment, fromFile?._id, toFile?._id, fromVersion, toVersion]);

  const counts = countDiffChanges(diffLines);
  const visibleLines = hideUnchanged ? diffLines.filter((l) => l.type !== 'unchanged') : diffLines;

  return (
    <Modal open onClose={onClose} size="sheet" className="modal-panel-lg">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Compare versions</h2>
          <p className="text-sm text-[var(--text-muted)]">{environment} environment</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--foreground)]"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="border-b border-[var(--border)] px-4 py-4 sm:px-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:flex-none">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">From version</label>
          <select
            value={fromVersion}
            onChange={(e) => setFromVersion(Number(e.target.value))}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] sm:w-auto"
          >
            {sorted.map((v) => (
              <option key={v._id} value={v.version}>
                v{v.version}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1 sm:flex-none">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">To version</label>
          <select
            value={toVersion}
            onChange={(e) => setToVersion(Number(e.target.value))}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] sm:w-auto"
          >
            {sorted.map((v) => (
              <option key={v._id} value={v.version}>
                v{v.version}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] sm:pb-2">
          <input
            type="checkbox"
            checked={hideUnchanged}
            onChange={(e) => setHideUnchanged(e.target.checked)}
          />
          Hide unchanged
        </label>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {fromVersion === toVersion ? (
          <p className="text-sm text-[var(--text-muted)]">Select two different versions to compare.</p>
        ) : loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading and comparing...</p>
        ) : error ? (
          <p className="text-sm text-[var(--error)]">{error}</p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              <span className="text-green-400">{counts.added} added</span>
              {' · '}
              <span className="text-[var(--error)]">{counts.removed} removed</span>
              {' · '}
              <span className="text-[var(--warning)]">{counts.changed} changed</span>
            </p>
            {visibleLines.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No differences found.</p>
            ) : (
              <div className="font-mono text-sm space-y-1 break-all">
                {visibleLines.map((line) => (
                  <div
                    key={line.key}
                    className={`rounded px-2 py-1 ${
                      line.type === 'added'
                        ? 'bg-green-500/10 text-green-400'
                        : line.type === 'removed'
                          ? 'bg-red-500/10 text-red-400 line-through'
                          : line.type === 'changed'
                            ? 'bg-yellow-500/10 text-[var(--warning)]'
                            : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {line.type === 'removed' && (
                      <span>
                        - {line.key}={line.oldValue}
                      </span>
                    )}
                    {line.type === 'added' && (
                      <span>
                        + {line.key}={line.newValue}
                      </span>
                    )}
                    {line.type === 'changed' && (
                      <span>
                        ~ {line.key}: {line.oldValue} → {line.newValue}
                      </span>
                    )}
                    {line.type === 'unchanged' && (
                      <span>
                        {line.key}={line.newValue}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-[var(--border)] px-4 py-4 sm:px-6 flex justify-end">
        <Button variant="outline" size="md" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
