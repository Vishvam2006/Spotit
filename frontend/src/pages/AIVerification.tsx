import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Car,
  Sparkles,
  RefreshCw,
  Trash2,
  Calendar,
  UserCheck,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import Spinner from '../components/ui/Spinner';
import { fetchVehicles } from '../services/vehicles';
import { verifyUploadedDocuments, type VerificationResultData } from '../services/verification';
import type { Vehicle } from '../types/vehicle';
import { notifySuccess, notifyError } from '../utils/notify';

interface LocalFileItem {
  id: string;
  file: File;
  previewUrl: string;
  docTypeTag: string;
  base64: string;
}

export function AIVerification() {
  const [searchParams] = useSearchParams();
  const targetVehicleParam = searchParams.get('vehicleId');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(targetVehicleParam || '');
  const [files, setFiles] = useState<LocalFileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [result, setResult] = useState<VerificationResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserVehicles();
  }, []);

  const loadUserVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const list = await fetchVehicles();
      setVehicles(list);

      if (targetVehicleParam && list.some((v) => v.id === targetVehicleParam)) {
        setSelectedVehicleId(targetVehicleParam);
      } else {
        const defaultVeh = list.find((v) => v.isDefault) || list[0];
        if (defaultVeh) {
          setSelectedVehicleId(defaultVeh.id);
        }
      }
    } catch (err) {
      console.warn('Could not load user vehicles:', err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileList = Array.from(selectedFiles);

    fileList.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        notifyError(`File ${file.name} is not an image.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Str = e.target?.result as string;
        let tag = 'VEHICLE_RC';
        const lowerName = file.name.toLowerCase();
        if (lowerName.includes('license') || lowerName.includes('dl')) tag = 'DRIVING_LICENSE';
        else if (lowerName.includes('id') || lowerName.includes('aadhaar')) tag = 'IDENTITY_PROOF';
        else if (lowerName.includes('pass') || lowerName.includes('permit')) tag = 'PARKING_PERMIT';

        setFiles((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            file,
            previewUrl: URL.createObjectURL(file),
            docTypeTag: tag,
            base64: base64Str,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleStartVerification = async () => {
    if (files.length === 0) {
      notifyError('Please add a photo of your Vehicle Registration Certificate (RC Book).');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(1);
    setErrorMsg(null);
    setResult(null);

    const timer1 = setTimeout(() => setAnalysisStep(2), 600);
    const timer2 = setTimeout(() => setAnalysisStep(3), 1200);

    try {
      const selectedVeh = vehicles.find((v) => v.id === selectedVehicleId);
      const res = await verifyUploadedDocuments({
        files: files.map((f) => ({ name: f.file.name, data: f.base64 })),
        vehicleId: selectedVehicleId || undefined,
        expectedRegistration: selectedVeh ? selectedVeh.registration : undefined,
      });

      setAnalysisStep(4);
      setTimeout(() => {
        setResult(res);
        setIsAnalyzing(false);
        if (res.overallStatus === 'VERIFIED') {
          notifySuccess('Document verification completed successfully!');
        } else {
          notifyError(res.summary || 'Document verification failed. Image is not a valid RC Book.');
        }
      }, 400);
    } catch (err: any) {
      setIsAnalyzing(false);
      const msg = err?.response?.data?.message || err?.message || 'Verification service failed. Please try again.';
      setErrorMsg(msg);
      notifyError(msg);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  };

  const selectedVeh = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <AppLayout>
      <main className="mx-auto max-w-4xl px-4 pt-8 pb-24 sm:px-6 md:pb-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              AI Vehicle Verification
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload photos of your Vehicle Registration Certificate (RC Book) to match details against your garage in /my-vehicles.
            </p>
          </div>
        </div>

        {/* Pre-selected Vehicle Banner (if navigated from MyVehicles) */}
        {selectedVeh && targetVehicleParam && (
          <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2 text-white">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Connected from My Vehicles</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  Verifying RC for: {selectedVeh.registration} ({selectedVeh.make || ''} {selectedVeh.model || 'Vehicle'})
                </p>
              </div>
            </div>
            <Link to="/my-vehicles" className="text-xs font-semibold text-blue-700 hover:underline">
              Change Vehicle
            </Link>
          </div>
        )}

        {/* Verification Input Form Card */}
        {!result && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Document Upload & Matching</h2>

            {/* Target Vehicle Selector */}
            <div className="space-y-2">
              <label htmlFor="vehicle-select" className="block text-sm font-semibold text-slate-700">
                Select Vehicle from /my-vehicles
              </label>
              {loadingVehicles ? (
                <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                  <Spinner className="h-4 w-4 text-blue-600" /> Loading your vehicles...
                </div>
              ) : (
                <select
                  id="vehicle-select"
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Standalone Scan (No pre-selected vehicle) --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration} — {v.make || ''} {v.model || 'Vehicle'} ({v.type}) {v.isDefault ? '★ Default' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* File Drag-and-Drop Area */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                RC Book / Vehicle Document Photo
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  handleFileSelect(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    <span className="font-semibold text-blue-600 hover:underline">Click to upload photo</span> or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">
                    Supported: JPG, PNG, WEBP (Max 8MB each)
                  </p>
                </div>
              </div>
            </div>

            {/* Uploaded File Previews */}
            {files.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Uploaded Documents ({files.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {files.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="h-14 w-14 rounded-lg object-cover border border-slate-200"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">{item.file.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {(item.file.size / 1024).toFixed(1)} KB
                        </p>
                        <span className="inline-block mt-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                          {item.docTypeTag}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(item.id);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Alert */}
            {errorMsg && <Alert variant="error" message={errorMsg} />}

            {/* Action Button */}
            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleStartVerification}
                loading={isAnalyzing}
                disabled={files.length === 0 || isAnalyzing}
                className="sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                Start AI Verification
              </Button>
            </div>
          </div>
        )}

        {/* Loading Progress State */}
        {isAnalyzing && (
          <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center space-y-6">
            <div className="flex justify-center">
              <Spinner className="h-10 w-10 text-blue-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Scanning & Extracting RC Book Details</h3>
              <p className="text-sm text-slate-500">Groq AI Vision is parsing image text and validating vehicle registration.</p>
            </div>

            <div className="mx-auto max-w-sm space-y-2 text-left text-sm text-slate-600">
              <div className={`flex items-center gap-2 ${analysisStep >= 1 ? 'text-blue-600 font-semibold' : ''}`}>
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Preprocessing document image
              </div>
              <div className={`flex items-center gap-2 ${analysisStep >= 2 ? 'text-blue-600 font-semibold' : ''}`}>
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Groq Optical Character Recognition
              </div>
              <div className={`flex items-center gap-2 ${analysisStep >= 3 ? 'text-blue-600 font-semibold' : ''}`}>
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Verifying Registration Number & Validity
              </div>
              <div className={`flex items-center gap-2 ${analysisStep >= 4 ? 'text-blue-600 font-semibold' : ''}`}>
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Cross-referencing /my-vehicles records
              </div>
            </div>
          </div>
        )}

        {/* Verification Results Display */}
        {result && !isAnalyzing && (
          <div className="mt-6 space-y-6">
            {/* Status Summary Banner */}
            <div
              className={`rounded-2xl p-6 shadow-sm ring-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                result.overallStatus === 'VERIFIED'
                  ? 'bg-emerald-50 ring-emerald-200 text-emerald-900'
                  : result.overallStatus === 'NEEDS_REVIEW'
                  ? 'bg-amber-50 ring-amber-200 text-amber-900'
                  : 'bg-rose-50 ring-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-xl p-3 ${
                    result.overallStatus === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : result.overallStatus === 'NEEDS_REVIEW'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {result.overallStatus === 'VERIFIED' ? (
                    <CheckCircle2 className="h-8 w-8" />
                  ) : result.overallStatus === 'NEEDS_REVIEW' ? (
                    <AlertTriangle className="h-8 w-8" />
                  ) : (
                    <XCircle className="h-8 w-8" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Result: {result.overallStatus}
                    </span>
                    <span className="text-xs opacity-75">• Verification ID: {result.verificationId}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {result.overallStatus === 'VERIFIED'
                      ? 'Vehicle RC Document Verified'
                      : result.overallStatus === 'NEEDS_REVIEW'
                      ? 'Manual Review Recommended'
                      : 'Document Rejected (Invalid / Non-RC Image)'}
                  </h2>
                  <p className="text-sm mt-1 text-slate-600">{result.summary}</p>
                </div>
              </div>

              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200 shrink-0">
                <div className="text-xl font-extrabold text-slate-900">
                  {Math.round(result.overallConfidence * 100)}%
                </div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase">AI Score</div>
              </div>
            </div>

            {/* Target Vehicle Match Card (If vehicle selected) */}
            {result.targetVehicle && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Car className="h-4 w-4 text-blue-600" />
                  Vehicle Cross-Reference Match (/my-vehicles)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Registered Garage Record</p>
                    <p className="text-base font-bold text-blue-700 mt-1">{result.targetVehicle.registration}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {result.targetVehicle.make || ''} {result.targetVehicle.model || 'Vehicle'} ({result.targetVehicle.type})
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Extracted RC Book Document</p>
                    <p className="text-base font-bold text-slate-900 mt-1">
                      {result.documents[0]?.extractedFields.vehicleNumber || 'NO MATCH / UNREADABLE'}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {result.documents[0]?.extractedFields.vehicleClass || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Extracted Details */}
            {result.documents.map((doc, idx) => (
              <div key={idx} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{doc.filename}</h4>
                      <p className="text-xs text-slate-500">Document Type: <strong className="text-slate-700">{doc.documentType}</strong></p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                    doc.status === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Car className="h-3.5 w-3.5 text-blue-600" /> Registration Number
                    </span>
                    <p className="font-bold text-slate-900 mt-1">
                      {doc.extractedFields.vehicleNumber || doc.extractedFields.documentNumber || 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <UserCheck className="h-3.5 w-3.5 text-blue-600" /> Owner Name
                    </span>
                    <p className="font-bold text-slate-900 mt-1">
                      {doc.extractedFields.ownerName || 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-blue-600" /> Expiry Status
                    </span>
                    <p className="font-bold text-slate-900 mt-1">
                      {doc.extractedFields.expiryDate || 'Valid'}
                    </p>
                  </div>
                </div>

                {/* Validation checklist */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                    doc.checks.formatValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {doc.checks.formatValid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    Valid Document Format
                  </span>

                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                    doc.checks.registrationMatch ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {doc.checks.registrationMatch ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    Registration Match
                  </span>
                </div>
              </div>
            ))}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setResult(null);
                  setFiles([]);
                }}
                className="sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Verify Another Document
              </Button>

              <Link
                to="/my-vehicles"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Car className="h-4 w-4" />
                Go to My Vehicles
              </Link>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}

export default AIVerification;
