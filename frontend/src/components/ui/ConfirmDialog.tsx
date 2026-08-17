import Button from './Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="pm-sheet w-full rounded-t-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] ring-1 ring-[var(--pm-color-border)] sm:max-w-md sm:rounded-2xl sm:pb-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-[var(--pm-color-text)]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--pm-color-muted)]">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            fullWidth={false}
            className="w-full sm:w-auto"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            fullWidth={false}
            className="w-full sm:w-auto"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
