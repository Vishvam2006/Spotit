import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

export type AnalysisPhase = 'uploading' | 'analyzing';

interface Props {
  files: { id: string; name: string; previewUrl: string }[];
  phase: AnalysisPhase;
  uploadPercent: number;
  startedAt: number;
  onCancel: () => void;
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Honest progress.
 *
 * The upload phase is a real percentage from axios. The analysis phase happens
 * server-side with no progress events available, so it shows an indeterminate
 * bar and an elapsed timer rather than inventing a percentage -- the previous
 * version advanced a fake four-step checklist on hardcoded 600ms/1200ms timers
 * that bore no relation to what the engine was doing.
 */
export default function AnalysisProgress({
  files,
  phase,
  uploadPercent,
  startedAt,
  onCancel,
}: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 500);
    return () => clearInterval(timer);
  }, [startedAt]);

  const uploading = phase === 'uploading';

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 space-y-5 rounded-2xl bg-[var(--pm-color-surface)] p-6 shadow-sm ring-1 ring-[var(--pm-color-border)]"
    >
      <div className="flex items-center gap-3">
        <Spinner className="h-6 w-6 text-[var(--pm-color-action)]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-[var(--pm-color-text)]">
            {uploading ? 'Uploading your document' : 'Reading and verifying your document'}
          </h3>
          <p className="text-sm text-[var(--pm-color-muted)]">
            {uploading
              ? `${uploadPercent}% uploaded`
              : `${files.length} document${files.length === 1 ? '' : 's'} with the AI vision model`}
          </p>
        </div>
        <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--pm-color-muted)]">
          {formatElapsed(elapsed)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--pm-color-border-strong)]">
        {uploading ? (
          <div
            className="h-full rounded-full bg-[var(--pm-color-action)] transition-all duration-200"
            style={{ width: `${uploadPercent}%` }}
          />
        ) : (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--pm-color-action)]" />
        )}
      </div>

      <ul className="space-y-2">
        {files.map((file) => (
          <li key={file.id} className="flex items-center gap-3">
            <img
              src={file.previewUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-[var(--pm-color-border)]"
            />
            <FileText className="hidden h-4 w-4 text-[var(--pm-color-muted)]" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--pm-color-text)]">
              {file.name}
            </span>
            <span className="shrink-0 text-xs font-semibold text-[var(--pm-color-muted)]">
              {uploading ? 'Uploading' : 'Analyzing'}
            </span>
          </li>
        ))}
      </ul>

      {elapsed > 20_000 && (
        <p className="text-xs text-[var(--pm-color-muted)]">
          Vision models take a few seconds per page. Still working&hellip;
        </p>
      )}

      <Button variant="secondary" size="sm" fullWidth={false} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
