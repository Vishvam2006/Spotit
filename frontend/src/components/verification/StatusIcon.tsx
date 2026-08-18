import { AlertTriangle, CheckCircle2, HelpCircle, MinusCircle, XCircle } from 'lucide-react';
import type { CheckOutcome } from '../../services/verification';

/**
 * Renders the icon for an outcome. A component rather than a function returning
 * one, so nothing selects a component type during render.
 */
export default function StatusIcon({
  outcome,
  className,
}: {
  outcome: CheckOutcome;
  className?: string;
}) {
  switch (outcome) {
    case 'PASS':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'WARN':
      return <AlertTriangle className={className} aria-hidden="true" />;
    case 'FAIL':
      return <XCircle className={className} aria-hidden="true" />;
    case 'SKIPPED':
      return <MinusCircle className={className} aria-hidden="true" />;
    default:
      return <HelpCircle className={className} aria-hidden="true" />;
  }
}
