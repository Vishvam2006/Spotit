import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ShieldCheck,
  FileText,
  Car,
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import Spinner from '../components/ui/Spinner';
import { verifyDocumentApi, type VerificationResultData } from '../services/verification';
import { getErrorMessage } from '../services/api';
import { notifyError, notifySuccess } from '../utils/notify';
import { useAuth } from '../context/auth-context';

type DocType = 'DRIVING_LICENSE' | 'RC';

export default function AIVerification() {
  const { user } = useAuth();
  const [docType, setDocType] = useState<DocType>('DRIVING_LICENSE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResultData | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image (JPG, PNG) or PDF document.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit.');
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a document file to verify.');
      return;
    }
    if (docType === 'DRIVING_LICENSE' && !dateOfBirth) {
      setError('Please enter your Date of Birth for Driving Licence verification.');
      return;
    }

    setError(null);
    setSubmitting(true);
    setResult(null);

    try {
      const resData = await verifyDocumentApi(selectedFile, docType, dateOfBirth);
      setResult(resData);

      if (resData.status === 'VERIFIED') {
        notifySuccess('Document verified successfully!');
      } else if (resData.status === 'MISMATCH') {
        notifyError('Document details do not match account data.');
      } else if (resData.status === 'EXPIRED') {
        notifyError('Document has expired.');
      } else {
        notifyError(resData.message || 'Verification completed with warnings.');
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      notifyError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <AppLayout>
      <main className="mx-auto max-w-4xl px-4 pt-8 pb-24 sm:px-6 md:pb-8">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Document Verification</h1>
            <p className="text-sm text-slate-500">
              Verify your Driving Licence or Vehicle RC against your account details using AI.
            </p>
          </div>
        </div>

        {/* Document Selection Tabs */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setDocType('DRIVING_LICENSE');
              setResult(null);
              setError(null);
            }}
            className={`flex items-start gap-4 rounded-2xl p-5 text-left transition-all ${
              docType === 'DRIVING_LICENSE'
                ? 'bg-white ring-2 ring-blue-600 shadow-md'
                : 'bg-slate-50 hover:bg-white ring-1 ring-slate-200'
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                docType === 'DRIVING_LICENSE' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Driving Licence</h3>
              <p className="mt-1 text-xs text-slate-500">
                Verifies Licence Name and Date of Birth against account <span className="font-semibold text-slate-700">"{user?.fullName}"</span>.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocType('RC');
              setResult(null);
              setError(null);
            }}
            className={`flex items-start gap-4 rounded-2xl p-5 text-left transition-all ${
              docType === 'RC'
                ? 'bg-white ring-2 ring-blue-600 shadow-md'
                : 'bg-slate-50 hover:bg-white ring-1 ring-slate-200'
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                docType === 'RC' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Vehicle RC</h3>
              <p className="mt-1 text-xs text-slate-500">
                Verifies RC Owner Name and Registration Number against registered vehicles.
              </p>
            </div>
          </button>
        </div>

        {/* Verification Form Card */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert variant="error" message={error} />}

            {/* Date of birth field for DL */}
            {docType === 'DRIVING_LICENSE' && (
              <div>
                <label htmlFor="dob" className="block text-sm font-semibold text-slate-700">
                  Your Date of Birth (Required for DL)
                </label>
                <input
                  type="date"
                  id="dob"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            )}

            {/* Upload Box */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Upload {docType === 'DRIVING_LICENSE' ? 'Driving Licence' : 'Vehicle RC'} Image / PDF
              </label>
              <div className="mt-1.5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-blue-500 hover:bg-blue-50/30">
                <UploadCloud className="h-10 w-10 text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {selectedFile ? selectedFile.name : 'Click to upload or drag & drop document'}
                </p>
                <p className="mt-1 text-xs text-slate-500">Supports JPG, PNG, PDF (Max 10MB)</p>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="mt-4 text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white file:hover:bg-blue-700"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting || !selectedFile} className="flex-1">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-5 w-5 text-white" />
                    Analyzing Document...
                  </span>
                ) : (
                  '⚡ Verify Document'
                )}
              </Button>

              {result && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Verification Result Output Card */}
        {result && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Verification Outcome</h2>
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  result.status === 'VERIFIED'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                    : result.status === 'MISMATCH'
                    ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
                    : result.status === 'EXPIRED'
                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {result.status === 'VERIFIED' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {result.status === 'MISMATCH' && <XCircle className="h-4 w-4 text-red-600" />}
                {result.status === 'EXPIRED' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                {['UNKNOWN_DOCUMENT', 'OCR_FAILED', 'PROCESSING_ERROR'].includes(result.status) && (
                  <HelpCircle className="h-4 w-4 text-slate-500" />
                )}
                {result.status}
              </span>
            </div>

            {/* Message alert */}
            <div className="mt-4">
              {result.status === 'VERIFIED' ? (
                <Alert variant="success" message={result.message || 'Document information verified successfully against your account data!'} />
              ) : (
                <Alert variant="error" message={result.message || 'Verification could not be completed.'} />
              )}
            </div>

            {/* Checks List */}
            {result.checks && (
              <div className="mt-5 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Component Checks</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {Object.entries(result.checks).map(([key, val]) => (
                    <div key={key} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <p className="text-xs font-medium uppercase text-slate-500">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-bold text-slate-900">{val}</span>
                        {val === 'MATCH' || val === 'VALID' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : val === 'MISMATCH' || val === 'EXPIRED' ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <HelpCircle className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              <FileCheck className="h-4 w-4 shrink-0 text-slate-400" />
              <span>Zero Retention: Uploaded document data was processed securely in memory and discarded.</span>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
