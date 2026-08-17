import { useState, type FormEvent } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { createComplaint } from '../../services/complaints';
import { getErrorMessage } from '../../services/api';
import { notifySuccess } from '../../utils/notify';
import { COMPLAINT_CATEGORIES } from '../../utils/complaints';

interface ComplaintFormProps {
  parkingLotId?: string;
  bookingId?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function ComplaintForm({
  parkingLotId,
  bookingId,
  onClose,
  onSubmitted,
}: ComplaintFormProps) {
  const [category, setCategory] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!category) {
      setError('Please choose a category.');
      return;
    }

    if (!subject.trim() || !description.trim()) {
      setError('Please fill in the subject and description.');
      return;
    }

    setLoading(true);
    try {
      await createComplaint({
        category,
        subject: subject.trim(),
        description: description.trim(),
        parkingLotId,
        bookingId,
      });
      notifySuccess('Complaint submitted. Our team will look into it.');
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report an issue"
        className="pm-sheet relative w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl bg-[var(--pm-color-surface)] p-6 shadow-2xl ring-1 ring-[var(--pm-color-border)] sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[var(--pm-color-text)]">
                Report an issue
              </h2>
              <p className="text-sm text-[var(--pm-color-muted)]">
                We will review it and get back to you.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] transition-colors hover:bg-[var(--pm-color-border)] focus:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <div>
            <label
              htmlFor="complaint-category"
              className="block text-sm font-semibold text-[var(--pm-color-text)]"
            >
              Category
            </label>
            <select
              id="complaint-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3.5 py-2.5 text-base text-[var(--pm-color-text)] shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pm-color-focus)] sm:text-sm"
            >
              <option value="">Choose a category</option>
              {COMPLAINT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <Input
            id="complaint-subject"
            label="Subject"
            placeholder="Brief summary of the issue"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
          />

          <div>
            <label
              htmlFor="complaint-description"
              className="block text-sm font-semibold text-[var(--pm-color-text)]"
            >
              Description
            </label>
            <textarea
              id="complaint-description"
              rows={4}
              placeholder="Describe the issue in detail"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3.5 py-2.5 text-base text-[var(--pm-color-text)] shadow-sm transition-colors placeholder:text-[var(--pm-color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pm-color-focus)] sm:text-sm"
            />
          </div>

          {error && <Alert variant="error" message={error} />}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              fullWidth={false}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} fullWidth={false}>
              {loading ? 'Submitting...' : 'Submit complaint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}