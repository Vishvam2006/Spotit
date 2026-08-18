import type { CheckOutcome } from '../../services/verification';
import StatusIcon from './StatusIcon';
import {
  type OverallStatus,
  outcomeTone,
  overallStatusLabel,
  overallTone,
  toneClasses,
} from './verificationTokens';

interface Props {
  /** Either a per-check outcome or an overall document status. */
  status: CheckOutcome | OverallStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const OVERALL_STATUSES = ['VERIFIED', 'NEEDS_REVIEW', 'REJECTED'];

const OVERALL_AS_OUTCOME: Record<string, CheckOutcome> = {
  VERIFIED: 'PASS',
  NEEDS_REVIEW: 'WARN',
  REJECTED: 'FAIL',
};

export default function VerificationStatusBadge({ status, label, size = 'md' }: Props) {
  const isOverall = OVERALL_STATUSES.includes(status);
  const tone = isOverall
    ? overallTone[status as OverallStatus]
    : outcomeTone[status as CheckOutcome];
  const classes = toneClasses(tone);
  const iconOutcome = isOverall ? OVERALL_AS_OUTCOME[status] : (status as CheckOutcome);

  const text =
    label ?? (isOverall ? overallStatusLabel(status as OverallStatus) : titleCase(status));

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${classes.bg} ${classes.fg} ${classes.ring} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <StatusIcon outcome={iconOutcome} className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {text}
    </span>
  );
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
