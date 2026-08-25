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

/**
 * The user-facing result states, finer than the three verdicts the engine
 * returns. These do NOT change the verdict — they split the two umbrella
 * verdicts (NEEDS_REVIEW, REJECTED) into the distinct things a user should do
 * about them, derived from `engineStatus`/`engineAvailable` already on the wire:
 *
 *   NEEDS_REVIEW  -> NEEDS_REUPLOAD    (couldn't read it — retake a clearer photo)
 *                 -> TEMPORARY_FAILURE (engine hiccup — not a verdict, try again)
 *                 -> NEEDS_REVIEW      (read it, a human should look)
 *   REJECTED      -> INVALID_DOCUMENT  (wrong kind of document — upload the right one)
 *                 -> REJECTED          (genuine content mismatch / expired)
 */
export type ResultState =
  | 'VERIFIED'
  | 'NEEDS_REUPLOAD'
  | 'TEMPORARY_FAILURE'
  | 'NEEDS_REVIEW'
  | 'INVALID_DOCUMENT'
  | 'REJECTED';

interface ResultStateInput {
  overallStatus: OverallStatus;
  engineAvailable?: boolean;
  documents: { engineStatus?: string }[];
}

export function deriveResultState(result: ResultStateInput): ResultState {
  // The engine was never reached: this is explicitly not a verdict.
  if (result.engineAvailable === false) return 'TEMPORARY_FAILURE';
  if (result.overallStatus === 'VERIFIED') return 'VERIFIED';

  const engineStatuses = result.documents.map((d) => (d.engineStatus ?? '').toUpperCase());

  if (result.overallStatus === 'REJECTED') {
    // "Not a recognised document" is a re-upload-the-right-thing case, distinct
    // from a real mismatch/expiry, so it must not read like a fraud rejection.
    if (engineStatuses.some((s) => s === 'UNKNOWN_DOCUMENT')) return 'INVALID_DOCUMENT';
    return 'REJECTED';
  }

  // NEEDS_REVIEW umbrella.
  if (engineStatuses.some((s) => s === 'OCR_FAILED')) return 'NEEDS_REUPLOAD';
  if (engineStatuses.some((s) => s === 'PROCESSING_ERROR')) return 'TEMPORARY_FAILURE';
  return 'NEEDS_REVIEW';
}

const RESULT_STATE_HEADLINES: Record<ResultState, string> = {
  VERIFIED: 'Document verified',
  NEEDS_REUPLOAD: "We couldn't read this clearly",
  TEMPORARY_FAILURE: "We couldn't reach the verification engine",
  NEEDS_REVIEW: "We couldn't fully confirm this document",
  INVALID_DOCUMENT: "That doesn't look like the right document",
  REJECTED: 'This document was not accepted',
};

const RESULT_STATE_GUIDANCE: Record<ResultState, string | null> = {
  VERIFIED: null,
  NEEDS_REUPLOAD:
    'Retake the photo in good light, hold steady, and make sure all four corners and the text are sharp.',
  TEMPORARY_FAILURE:
    'Your document was not rejected — it was never checked, and nothing has been recorded. Please try again shortly.',
  NEEDS_REVIEW: null,
  INVALID_DOCUMENT:
    'Upload a clear photo of your Vehicle RC or Driving Licence, not another document or image.',
  REJECTED: null,
};

export function resultStateHeadline(state: ResultState): string {
  return RESULT_STATE_HEADLINES[state] ?? 'Verification complete';
}

export function resultStateGuidance(state: ResultState): string | null {
  return RESULT_STATE_GUIDANCE[state] ?? null;
}
