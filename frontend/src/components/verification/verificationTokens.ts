import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  MinusCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { CheckOutcome } from '../../services/verification';

export type Tone = 'pass' | 'warn' | 'fail' | 'neutral';

export type OverallStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';

/**
 * Status colours come from CSS custom properties rather than Tailwind palette
 * classes: the theme switches on [data-theme], so `dark:` variants would follow
 * the OS instead of the app, and the pale `*-50` backgrounds used previously are
 * unreadable under the dark theme's white text.
 */
export function toneClasses(tone: Tone) {
  return {
    fg: `text-[var(--pm-status-${tone})]`,
    bg: `bg-[var(--pm-status-${tone}-soft)]`,
    ring: `ring-[var(--pm-status-${tone}-border)]`,
    border: `border-[var(--pm-status-${tone}-border)]`,
    stroke: `var(--pm-status-${tone})`,
  };
}

export const outcomeTone: Record<CheckOutcome, Tone> = {
  PASS: 'pass',
  WARN: 'warn',
  FAIL: 'fail',
  SKIPPED: 'neutral',
  UNKNOWN: 'neutral',
};

export const overallTone: Record<OverallStatus, Tone> = {
  VERIFIED: 'pass',
  NEEDS_REVIEW: 'warn',
  REJECTED: 'fail',
};

const OUTCOME_ICONS: Record<CheckOutcome, LucideIcon> = {
  PASS: CheckCircle2,
  WARN: AlertTriangle,
  FAIL: XCircle,
  SKIPPED: MinusCircle,
  UNKNOWN: HelpCircle,
};

export function outcomeIcon(outcome: CheckOutcome): LucideIcon {
  return OUTCOME_ICONS[outcome] ?? HelpCircle;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  VEHICLE_RC: 'Vehicle Registration Certificate',
  DRIVING_LICENSE: 'Driving Licence',
  IDENTITY_PROOF: 'Identity Document',
  PARKING_PERMIT: 'Parking Permit',
  UNKNOWN: 'Unrecognised document',
  INVALID_DOCUMENT: 'Not a document',
};

/** Raw enums must never reach the screen. */
export function documentTypeLabel(type?: string | null): string {
  if (!type) return 'Unrecognised document';
  return DOCUMENT_TYPE_LABELS[type] ?? 'Document';
}

const OVERALL_LABELS: Record<OverallStatus, string> = {
  VERIFIED: 'Verified',
  NEEDS_REVIEW: 'Needs a manual look',
  REJECTED: 'Not accepted',
};

export function overallStatusLabel(status: OverallStatus): string {
  return OVERALL_LABELS[status] ?? 'Not checked';
}

const OVERALL_HEADLINES: Record<OverallStatus, string> = {
  VERIFIED: 'Document verified',
  NEEDS_REVIEW: "We couldn't fully confirm this document",
  REJECTED: 'This document was not accepted',
};

export function overallStatusHeadline(status: OverallStatus, engineAvailable = true): string {
  if (!engineAvailable) return "We couldn't reach the verification engine";
  return OVERALL_HEADLINES[status] ?? 'Verification complete';
}

export function confidenceTone(score: number): Tone {
  if (score >= 0.85) return 'pass';
  if (score >= 0.6) return 'warn';
  return 'fail';
}

export function confidenceLabel(score: number): string {
  if (score >= 0.85) return 'High';
  if (score >= 0.6) return 'Moderate';
  if (score >= 0.35) return 'Low';
  return 'Very low';
}

export const CONFIDENCE_COMPONENT_LABELS: Record<string, string> = {
  fieldCompleteness: 'Fields extracted',
  normalization: 'Values parsed cleanly',
  validatorAgreement: 'Checks agreed',
  legibility: 'Image legibility',
  documentTypeCertainty: 'Document type certainty',
};
