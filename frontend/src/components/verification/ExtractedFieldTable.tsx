import type { DocumentResultItem, FieldReading } from '../../services/verification';
import { outcomeTone, toneClasses } from './verificationTokens';

/** Derives readings from the legacy flat `extractedFields` when `fields` is absent. */
function fromLegacyFields(doc: DocumentResultItem): FieldReading[] {
  const f = doc.extractedFields;
  return [
    { id: 'vehicleNumber', label: 'Registration Number', value: f.vehicleNumber },
    { id: 'ownerName', label: 'Owner Name', value: f.ownerName },
    { id: 'documentNumber', label: 'Document Number', value: f.documentNumber },
    { id: 'expiryDate', label: 'Valid Until', value: f.expiryDate },
  ];
}

function FieldCell({ reading }: { reading: FieldReading }) {
  const tone = outcomeTone[reading.state ?? 'UNKNOWN'];
  const classes = toneClasses(tone);
  const showRaw = reading.rawValue && reading.rawValue !== reading.value;
  const showExpected = reading.expected && reading.expected !== reading.value;

  return (
    <div className="rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] p-3">
      <p className="text-xs font-medium text-[var(--pm-color-muted)]">{reading.label}</p>

      {reading.value ? (
        <p className="mt-1 font-mono text-sm font-bold break-words text-[var(--pm-color-text)]">
          {reading.value}
        </p>
      ) : (
        /* Never claim a value we do not have. The old UI rendered
           `expiryDate || 'Valid'`, asserting validity for a field it never read. */
        <p className="mt-1 text-sm italic text-[var(--pm-color-muted)]">
          Not printed or not readable
        </p>
      )}

      {showRaw && (
        <p className="mt-0.5 text-[11px] italic text-[var(--pm-color-muted)]">
          Read as &ldquo;{reading.rawValue}&rdquo;
        </p>
      )}

      {showExpected && (
        <p className={`mt-1 text-[11px] font-semibold ${classes.fg}`}>
          Your record: {reading.expected}
        </p>
      )}
    </div>
  );
}

export default function ExtractedFieldTable({ doc }: { doc: DocumentResultItem }) {
  const readings = doc.fields?.length ? doc.fields : fromLegacyFields(doc);
  const visible = readings.filter((r) => r.value || r.expected || r.rawValue);

  if (visible.length === 0) {
    return (
      <p className="text-sm italic text-[var(--pm-color-muted)]">
        No fields could be read from this document.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {visible.map((reading) => (
        <FieldCell key={reading.id} reading={reading} />
      ))}
    </div>
  );
}
