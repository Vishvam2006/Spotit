import type { DocumentResultItem } from '../../services/verification';
import CheckList from './CheckList';
import ConfidenceGauge from './ConfidenceGauge';
import DocumentThumbnail from './DocumentThumbnail';
import ExtractedFieldTable from './ExtractedFieldTable';
import VerificationStatusBadge from './VerificationStatusBadge';
import { documentTypeLabel, overallTone, toneClasses } from './verificationTokens';

interface Props {
  doc: DocumentResultItem;
  previewUrl?: string;
}

export default function DocumentResultCard({ doc, previewUrl }: Props) {
  const tone = overallTone[doc.status] ?? 'neutral';
  const classes = toneClasses(tone);

  return (
    <article className="overflow-hidden rounded-2xl bg-[var(--pm-color-surface)] shadow-sm ring-1 ring-[var(--pm-color-border)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--pm-color-border)] p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--pm-color-text)]">{doc.filename}</p>
          <p className="text-xs text-[var(--pm-color-muted)]">
            {doc.documentTypeLabel ?? documentTypeLabel(doc.documentType)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VerificationStatusBadge status={doc.status} label={doc.statusLabel} />
          <ConfidenceGauge value={doc.confidenceScore} size="sm" compact />
        </div>
      </header>

      <div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
        <div className="space-y-2 self-start md:sticky md:top-4">
          {/* Keeping the upload beside its result is what lets a viewer check the
              extracted values against the actual document. */}
          <DocumentThumbnail src={previewUrl} alt={`Uploaded document ${doc.filename}`} />
          {previewUrl && (
            <p className="text-center text-[11px] text-[var(--pm-color-muted)]">Tap to enlarge</p>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <section>
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--pm-color-muted)]">
              Verification checks
            </h4>
            <CheckList doc={doc} />
          </section>

          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--pm-color-muted)]">
              Extracted from the document
            </h4>
            <ExtractedFieldTable doc={doc} />
          </section>

          {doc.summary && (
            <p
              className={`rounded-xl border-l-2 bg-[var(--pm-color-surface-raised)] p-3 text-sm text-[var(--pm-color-muted)] ${classes.border}`}
            >
              {doc.summary}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
