import { ArrowRight, Car } from 'lucide-react';
import type { DocumentResultItem, VerificationResultData } from '../../services/verification';
import VerificationStatusBadge from './VerificationStatusBadge';
import { toneClasses } from './verificationTokens';

interface Props {
  targetVehicle: NonNullable<VerificationResultData['targetVehicle']>;
  documents: DocumentResultItem[];
}

export default function VehicleCrossReference({ targetVehicle, documents }: Props) {
  // Pick the document that actually carries a registration number. The previous
  // version hardcoded documents[0], so with several uploads it compared the
  // wrong file -- or a file with no registration at all.
  const governing =
    documents.find((doc) => doc.extractedFields.vehicleNumber) ?? documents[0];
  const extracted = governing?.extractedFields.vehicleNumber ?? null;

  const registrationCheck = governing?.checkResults?.find((c) => c.id === 'registrationMatch');
  const outcome = registrationCheck?.status ?? (extracted === targetVehicle.registration ? 'PASS' : 'FAIL');
  const classes = toneClasses(outcome === 'PASS' ? 'pass' : outcome === 'FAIL' ? 'fail' : 'neutral');

  return (
    <section className="space-y-4 rounded-2xl bg-[var(--pm-color-surface)] p-6 shadow-sm ring-1 ring-[var(--pm-color-border)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--pm-color-text)]">
          <Car className="h-4 w-4 text-[var(--pm-color-action)]" aria-hidden="true" />
          Cross-reference with your garage
        </h3>
        <VerificationStatusBadge status={outcome} size="sm" />
      </div>

      <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] p-4">
          <p className="text-xs font-medium text-[var(--pm-color-muted)]">Your registered vehicle</p>
          <p className="mt-1 font-mono text-base font-bold text-[var(--pm-color-text)]">
            {targetVehicle.registration}
          </p>
          <p className="mt-0.5 text-xs text-[var(--pm-color-muted)]">
            {[targetVehicle.make, targetVehicle.model].filter(Boolean).join(' ') || 'Vehicle'} (
            {targetVehicle.type})
          </p>
        </div>

        <ArrowRight
          className={`mx-auto hidden h-5 w-5 sm:block ${classes.fg}`}
          aria-hidden="true"
        />

        <div className="rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] p-4">
          <p className="text-xs font-medium text-[var(--pm-color-muted)]">Read from the document</p>
          {extracted ? (
            <p className={`mt-1 font-mono text-base font-bold ${classes.fg}`}>{extracted}</p>
          ) : (
            <p className="mt-1 text-sm italic text-[var(--pm-color-muted)]">
              No registration number could be read
            </p>
          )}
        </div>
      </div>

      {registrationCheck && (
        <p className="text-sm text-[var(--pm-color-muted)]">{registrationCheck.detail}</p>
      )}
    </section>
  );
}
