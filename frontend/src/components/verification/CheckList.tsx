import type { CheckOutcome, CheckResultItem, DocumentResultItem } from '../../services/verification';
import CheckRow from './CheckRow';

/**
 * Synthesizes the four check rows from the legacy booleans when an older engine
 * (or the bridge fallback) responds without `checkResults`. The previous UI
 * rendered only two of the four, so a name mismatch looked like a clean pass.
 */
function fromLegacyChecks(doc: DocumentResultItem): CheckResultItem[] {
  const bool = (value: boolean): CheckOutcome => (value ? 'PASS' : 'FAIL');
  return [
    {
      id: 'documentType',
      label: 'Recognised as a supported document',
      status: bool(doc.checks.formatValid),
      detail: doc.checks.formatValid
        ? 'The upload was recognised as an official document.'
        : 'The upload was not recognised as a supported document.',
    },
    {
      id: 'nameMatch',
      label: 'Owner name matches your account',
      status: bool(doc.checks.nameMatch),
      detail: doc.checks.nameMatch
        ? 'The name on the document matches your account.'
        : 'The name on the document does not match your account.',
    },
    {
      id: 'registrationMatch',
      label: 'Registration number matches your vehicle',
      status: bool(doc.checks.registrationMatch),
      detail: doc.checks.registrationMatch
        ? 'The registration number matches your garage record.'
        : 'The registration number does not match your garage record.',
    },
    {
      id: 'validity',
      label: 'Document is currently valid',
      status: bool(doc.checks.expiryCheck),
      detail: doc.checks.expiryCheck
        ? 'The document is within its validity period.'
        : 'The document is expired, or its validity could not be confirmed.',
    },
  ];
}

export default function CheckList({ doc }: { doc: DocumentResultItem }) {
  const checks = doc.checkResults?.length ? doc.checkResults : fromLegacyChecks(doc);

  return (
    <ul className="divide-y divide-[var(--pm-color-border)]">
      {checks.map((check) => (
        <CheckRow key={check.id} check={check} />
      ))}
    </ul>
  );
}
