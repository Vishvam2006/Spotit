import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import AnalysisProgress, {
  type AnalysisPhase,
} from '../components/verification/AnalysisProgress';
import DocumentResultCard from '../components/verification/DocumentResultCard';
import ResultBanner from '../components/verification/ResultBanner';
import VehicleCrossReference from '../components/verification/VehicleCrossReference';
import { getErrorMessage } from '../services/api';
import { fetchVehicles } from '../services/vehicles';
import { verifyUploadedDocuments, type VerificationResultData } from '../services/verification';
import type { Vehicle } from '../types/vehicle';
import { notifyError, notifyInfo, notifySuccess } from '../utils/notify';

interface LocalFileItem {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
}

/** Snapshot kept alive while results render, so each result keeps its thumbnail. */
interface ResultFile {
  id: string;
  name: string;
  previewUrl: string;
}

// Mirrors the limits enforced by the backend (verification.service.ts) so the
// user is told before a 15MB upload round-trips only to be rejected.
const MAX_FILES = 10;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function AIVerification() {
  const [searchParams] = useSearchParams();
  const targetVehicleParam = searchParams.get('vehicleId');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(targetVehicleParam || '');
  const [files, setFiles] = useState<LocalFileItem[]>([]);
  const [resultFiles, setResultFiles] = useState<ResultFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [phase, setPhase] = useState<AnalysisPhase>('uploading');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [result, setResult] = useState<VerificationResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadUserVehicles = useCallback(async () => {
    try {
      const list = await fetchVehicles();
      setVehicles(list);
      setVehiclesError(null);

      if (targetVehicleParam && list.some((v) => v.id === targetVehicleParam)) {
        setSelectedVehicleId(targetVehicleParam);
      } else {
        const preferred = list.find((v) => v.isDefault) || list[0];
        if (preferred) setSelectedVehicleId(preferred.id);
      }
    } catch (err) {
      setVehiclesError(getErrorMessage(err));
    } finally {
      setLoadingVehicles(false);
    }
  }, [targetVehicleParam]);

  useEffect(() => {
    let active = true;
    fetchVehicles()
      .then((list) => {
        if (!active) return;
        setVehicles(list);
        const preferred =
          (targetVehicleParam && list.find((v) => v.id === targetVehicleParam)) ||
          list.find((v) => v.isDefault) ||
          list[0];
        if (preferred) setSelectedVehicleId(preferred.id);
      })
      .catch((err) => {
        if (active) setVehiclesError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoadingVehicles(false);
      });
    return () => {
      active = false;
    };
  }, [targetVehicleParam]);

  // Revoke any preview URLs still held when the page unmounts.
  useEffect(
    () => () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      resultFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function handleFileSelect(selected: FileList | null) {
    if (!selected) return;

    Array.from(selected).forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        notifyError(`${file.name} is not a supported file. Upload a JPG, PNG, WEBP or PDF.`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        notifyError(`${file.name} is larger than 15MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFiles((prev) => {
          if (prev.length >= MAX_FILES) {
            notifyError(`You can verify at most ${MAX_FILES} documents at a time.`);
            return prev;
          }
          return [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              file,
              previewUrl: URL.createObjectURL(file),
              base64,
            },
          ];
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  async function runVerification(items: LocalFileItem[]) {
    if (items.length === 0) {
      notifyError('Add a photo of your document first.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsAnalyzing(true);
    setPhase('uploading');
    setUploadPercent(0);
    setStartedAt(Date.now());
    setErrorMsg(null);
    setResult(null);

    try {
      const selected = vehicles.find((v) => v.id === selectedVehicleId);
      const response = await verifyUploadedDocuments(
        {
          files: items.map((f) => ({ name: f.file.name, data: f.base64 })),
          vehicleId: selectedVehicleId || undefined,
          expectedRegistration: selected?.registration,
        },
        {
          signal: controller.signal,
          onUploadProgress: (percent) => {
            setUploadPercent(percent);
            if (percent >= 100) setPhase('analyzing');
          },
        },
      );

      // Hand the previews to the result view before the upload panel unmounts,
      // so each document renders beside the image it came from.
      setResultFiles(
        items.map((f) => ({ id: f.id, name: f.file.name, previewUrl: f.previewUrl })),
      );
      setResult(response);
      setIsAnalyzing(false);

      if (response.engineAvailable === false) {
        notifyError('The verification engine could not be reached. Nothing was checked.');
      } else if (response.overallStatus === 'VERIFIED') {
        notifySuccess('Document verified.');
        void loadUserVehicles();
      } else {
        notifyError(response.summary || 'Verification did not pass.');
      }
    } catch (err) {
      setIsAnalyzing(false);
      if (controller.signal.aborted) {
        notifyInfo('Verification cancelled.');
        return;
      }
      const message = getErrorMessage(err);
      setErrorMsg(message);
      notifyError(message);
    } finally {
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  function handleRetry() {
    void runVerification(files);
  }

  function startOver() {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    resultFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setResultFiles([]);
    setResult(null);
    setErrorMsg(null);
  }

  const showUpload = !result && !isAnalyzing;

  return (
    <AppLayout>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-8">
        <header className="flex items-center gap-3">
          <span className="rounded-xl bg-[var(--pm-color-action-soft)] p-2.5 text-[var(--pm-color-action)]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[var(--pm-color-text)]">AI Vehicle Verification</h1>
            <p className="text-sm text-[var(--pm-color-muted)]">
              We read your RC or licence and check it against your account. Every check below is one
              we actually ran.
            </p>
          </div>
        </header>

        {vehiclesError && (
          <div className="mt-4">
            <Alert variant="error" message={vehiclesError} />
          </div>
        )}

        {showUpload && (
          <div className="mt-6 space-y-6 rounded-2xl bg-[var(--pm-color-surface)] p-6 shadow-sm ring-1 ring-[var(--pm-color-border)]">
            <h2 className="text-lg font-bold text-[var(--pm-color-text)]">Upload your document</h2>

            <div className="space-y-2">
              <label
                htmlFor="vehicle-select"
                className="block text-sm font-semibold text-[var(--pm-color-text)]"
              >
                Check against which vehicle?
              </label>
              {loadingVehicles ? (
                <div className="flex items-center gap-2 py-2 text-sm text-[var(--pm-color-muted)]">
                  <Spinner className="h-4 w-4 text-[var(--pm-color-action)]" /> Loading your
                  vehicles&hellip;
                </div>
              ) : (
                <select
                  id="vehicle-select"
                  value={selectedVehicleId}
                  onChange={(event) => setSelectedVehicleId(event.target.value)}
                  className="w-full rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3.5 py-2.5 text-sm text-[var(--pm-color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pm-color-focus)]"
                >
                  <option value="">No vehicle &mdash; just read the document</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration} &mdash; {[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}
                      {v.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-semibold text-[var(--pm-color-text)]">
                RC book, licence or permit
              </span>

              <div
                role="button"
                tabIndex={0}
                aria-label="Upload a document photo"
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragOver(false);
                  handleFileSelect(event.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)] ${
                  isDragOver
                    ? 'border-[var(--pm-color-action)] bg-[var(--pm-color-action-soft)]'
                    : 'border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)]/50 hover:bg-[var(--pm-color-surface-raised)]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(event) => handleFileSelect(event.target.files)}
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  // Opens the camera directly on phones -- this is a
                  // photograph-a-document flow, not a pick-from-gallery one.
                  capture="environment"
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <span className="rounded-full bg-[var(--pm-color-action-soft)] p-3 text-[var(--pm-color-action)]">
                    <Upload className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-medium text-[var(--pm-color-text)]">
                    <span className="font-semibold text-[var(--pm-color-action)]">
                      Take a photo or upload
                    </span>{' '}
                    &mdash; or drag a file here
                  </p>
                  <p className="text-xs text-[var(--pm-color-muted)]">
                    JPG, PNG, WEBP or PDF &middot; up to 15MB each &middot; {MAX_FILES} max
                  </p>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--pm-color-muted)]">
                  Ready to verify ({files.length})
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {files.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)] p-3"
                    >
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="h-14 w-14 rounded-lg border border-[var(--pm-color-border)] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[var(--pm-color-text)]">
                          {item.file.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--pm-color-muted)]">
                          {(item.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        title="Remove"
                        aria-label={`Remove ${item.file.name}`}
                        className="rounded-lg p-1 text-[var(--pm-color-muted)] transition-colors hover:bg-[var(--pm-status-fail-soft)] hover:text-[var(--pm-status-fail)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && <Alert variant="error" message={errorMsg} />}

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => runVerification(files)}
                disabled={files.length === 0}
                fullWidth={false}
              >
                <Sparkles className="h-4 w-4" />
                Verify document
              </Button>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <AnalysisProgress
            files={files.map((f) => ({ id: f.id, name: f.file.name, previewUrl: f.previewUrl }))}
            phase={phase}
            uploadPercent={uploadPercent}
            startedAt={startedAt}
            onCancel={handleCancel}
          />
        )}

        {result && !isAnalyzing && (
          <div className="mt-6 space-y-6">
            <ResultBanner result={result} onRetry={handleRetry} />

            {result.targetVehicle && (
              <VehicleCrossReference
                targetVehicle={result.targetVehicle}
                documents={result.documents}
              />
            )}

            {result.documents.map((doc, index) => (
              <DocumentResultCard
                key={`${doc.filename}-${index}`}
                doc={doc}
                previewUrl={resultFiles[index]?.previewUrl}
              />
            ))}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={startOver} fullWidth={false}>
                Verify another document
              </Button>
              <Link
                to="/my-vehicles"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--pm-color-action)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--pm-color-action-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)]"
              >
                Go to my vehicles
              </Link>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}

export default AIVerification;
