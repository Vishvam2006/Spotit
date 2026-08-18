import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { X, AlertTriangle, Camera, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { reportBookingIssue, uploadEvidencePhoto } from '../../services/continuity';
import { getErrorMessage } from '../../services/api';
import { notifySuccess } from '../../utils/notify';
import {
  ACCEPTED_EVIDENCE_TYPES,
  ISSUE_OPTIONS,
  MAX_EVIDENCE_BYTES,
  MAX_EVIDENCE_PHOTOS,
  isSeriousIssue,
} from '../../utils/continuity';
import type { Booking } from '../../types/booking';
import type { IssueType, ReportIssueResult } from '../../types/continuity';

interface ReportIssueFormProps {
  booking: Booking;
  onClose: () => void;
  onReported?: (result: ReportIssueResult) => void;
}

/**
 * The user's entry point into the Continuity Engine. Deliberately not a
 * generic complaint box: the issue type is a fixed list because it decides
 * whether the booking gets frozen and whether the lot gets pulled from search,
 * and free text cannot drive either.
 */
export default function ReportIssueForm({
  booking,
  onClose,
  onReported,
}: ReportIssueFormProps) {
  const [issueType, setIssueType] = useState<IssueType | ''>('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = ISSUE_OPTIONS.find((option) => option.value === issueType);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    const room = MAX_EVIDENCE_PHOTOS - photos.length;
    if (room <= 0) {
      setError(`You can attach up to ${MAX_EVIDENCE_PHOTOS} photos.`);
      return;
    }

    setError('');
    setUploading(true);

    try {
      for (const file of files.slice(0, room)) {
        if (!ACCEPTED_EVIDENCE_TYPES.includes(file.type)) {
          setError('Photos must be JPG, PNG or WebP.');
          continue;
        }
        if (file.size > MAX_EVIDENCE_BYTES) {
          setError('Each photo must be under 8 MB.');
          continue;
        }
        const url = await uploadEvidencePhoto(file);
        setPhotos((current) => [...current, url]);
      }
    } catch (err) {
      // Evidence is optional by design: a user standing in a lot that will not
      // let them park should never be blocked from reporting by a failed
      // upload.
      setError(
        `${getErrorMessage(err)} You can still submit the report without a photo.`,
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!issueType) {
      setError('Please choose what went wrong.');
      return;
    }

    if (description.trim().length < 10) {
      setError('Please describe the issue in at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await reportBookingIssue(booking.id, {
        issueType,
        description: description.trim(),
        photos,
      });

      notifySuccess(
        result.bookingProtected
          ? 'Report filed. Your booking is protected while we review it.'
          : 'Report filed. We have passed it on to the parking owner.',
      );
      onReported?.(result);
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
        aria-label="Report an issue with this booking"
        className="pm-sheet relative max-h-[92vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl bg-[var(--pm-color-surface)] p-6 shadow-2xl ring-1 ring-[var(--pm-color-border)] sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[var(--pm-color-text)]">
                Report an issue
              </h2>
              <p className="text-sm text-[var(--pm-color-muted)]">
                {booking.parkingLot.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] transition-colors hover:bg-[var(--pm-color-border)] focus:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <fieldset>
            <legend className="text-sm font-semibold text-[var(--pm-color-text)]">
              What went wrong?
            </legend>
            <div className="mt-2 space-y-2">
              {ISSUE_OPTIONS.map((option) => {
                const isSelected = issueType === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                        : 'border-[var(--pm-color-border)] hover:bg-[var(--pm-color-surface-raised)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="issueType"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setIssueType(option.value)}
                      className="mt-1 h-4 w-4 accent-emerald-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[var(--pm-color-text)]">
                        {option.label}
                      </span>
                      <span className="block text-xs text-[var(--pm-color-muted)]">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {selected && isSeriousIssue(selected.value) && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Your booking will be kept on record as evidence while the parking
                owner and our team review this. It will not be deleted.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="issue-description"
              className="block text-sm font-semibold text-[var(--pm-color-text)]"
            >
              What happened?
            </label>
            <textarea
              id="issue-description"
              rows={4}
              placeholder="Tell us what you saw when you arrived."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3.5 py-2.5 text-base text-[var(--pm-color-text)] shadow-sm transition-colors placeholder:text-[var(--pm-color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pm-color-focus)] sm:text-sm"
            />
          </div>

          <div>
            <span className="block text-sm font-semibold text-[var(--pm-color-text)]">
              Photo evidence{' '}
              <span className="font-normal text-[var(--pm-color-muted)]">(optional)</span>
            </span>
            <p className="mt-0.5 text-xs text-[var(--pm-color-muted)]">
              A photo of the bay or the closed gate settles most cases quickly.
            </p>

            {photos.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {photos.map((url, index) => (
                  <li key={url} className="group relative">
                    <img
                      src={url}
                      alt={`Evidence ${index + 1}`}
                      className="aspect-square w-full rounded-lg object-cover ring-1 ring-[var(--pm-color-border)]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((current) => current.filter((item) => item !== url))
                      }
                      aria-label={`Remove evidence ${index + 1}`}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EVIDENCE_TYPES.join(',')}
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            {photos.length < MAX_EVIDENCE_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--pm-color-border-strong)] px-4 text-sm font-semibold text-[var(--pm-color-muted)] transition-colors hover:bg-[var(--pm-color-surface-raised)] disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    Add a photo
                  </>
                )}
              </button>
            )}
          </div>

          {error && <Alert variant="error" message={error} />}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" fullWidth={false} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={uploading}
              fullWidth={false}
            >
              {loading ? 'Submitting...' : 'Submit report'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
