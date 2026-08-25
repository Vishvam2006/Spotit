import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const MAX_FILES_PER_REQUEST = 10;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
// Sits above the engine's own AI_TOTAL_BUDGET_S (75s) so the engine gets the
// chance to return a partial answer before we give up on it.
const AI_ENGINE_TIMEOUT_MS = Number(process.env.AI_ENGINE_TIMEOUT_MS) || 90_000;

function isAllowedImageFormat(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return true; // JPEG
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return true; // PNG
  }
  if (buffer.subarray(0, 4).equals(Buffer.from('RIFF')) && buffer.subarray(8, 12).equals(Buffer.from('WEBP'))) {
    return true; // WEBP
  }
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return true; // PDF
  }
  return false;
}

function decodeVerificationFile(file: VerificationFile): Buffer {
  let base64Content = file.data;
  if (base64Content.includes(',')) {
    base64Content = base64Content.split(',')[1];
  }

  const buffer = Buffer.from(base64Content, 'base64');

  if (buffer.length === 0) {
    throw new VerificationError(400, 'Uploaded document is empty.', 'EMPTY_FILE');
  }

  if (buffer.length > MAX_FILE_BYTES) {
    throw new VerificationError(
      413,
      'Uploaded document is too large. Maximum allowed size is 15MB.',
      'FILE_TOO_LARGE',
    );
  }

  if (!isAllowedImageFormat(buffer)) {
    // A non-empty buffer too short to carry any real document signature is a
    // truncated/corrupted upload rather than a wrong file type.
    if (buffer.length < 12) {
      throw new VerificationError(
        400,
        'This file looks incomplete or corrupted and could not be read.',
        'CORRUPTED_FILE',
      );
    }
    // The bytes match no JPG/PNG/WEBP/PDF signature, so renaming another file
    // to a .jpg extension cannot slip past this content-based check.
    throw new VerificationError(
      400,
      'Uploaded file is not a valid JPG, PNG, WEBP, or PDF document.',
      'INVALID_FILE_TYPE',
    );
  }

  return buffer;
}

export interface VerificationFile {
  name: string;
  data: string; // Base64 data URI or raw string
}

export interface VerifyPayload {
  userId: string;
  files: VerificationFile[];
  vehicleId?: string;
  expectedRegistration?: string;
  expectedName?: string;
}

/**
 * Machine-readable reasons a document upload is rejected before verification
 * even starts. The frontend maps these to controlled, user-facing copy so a
 * raw backend message never reaches the screen.
 */
export type VerificationErrorCode =
  | 'NO_DOCUMENTS'
  | 'TOO_MANY_FILES'
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'CORRUPTED_FILE';

export class VerificationError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    // Undefined for generic errors, which the central handler reports as the
    // existing `VERIFICATION_ERROR` code (backwards compatible).
    public code?: VerificationErrorCode,
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

interface PersistVerificationInput {
  userId: string;
  vehicleId?: string;
  overallStatus: string;
  overallConfidence: number;
  summary: string;
  documents: unknown;
}

/**
 * Persists an audit record of every document verification and stamps the
 * outcome onto the vehicle it was run against, so the result is visible in
 * the user's garage instead of being written and never read.
 *
 * Best-effort: a storage failure must never affect the verification response.
 */
function persistVerification(input: PersistVerificationInput): void {
  prisma.verificationRequest
    .create({
      data: {
        userId: input.userId,
        vehicleId: input.vehicleId ?? null,
        overallStatus: input.overallStatus,
        overallConfidence: input.overallConfidence,
        summary: input.summary,
        documents: (input.documents ?? []) as Prisma.InputJsonValue,
      },
    })
    .catch((error) => {
      console.warn('[VerificationService] Failed to persist verification record:', error);
    });

  if (!input.vehicleId) return;

  // Scoped by userId as well so a forged vehicleId cannot stamp another
  // user's vehicle.
  prisma.vehicle
    .updateMany({
      where: { id: input.vehicleId, userId: input.userId },
      data: {
        verificationStatus: input.overallStatus,
        verifiedAt: new Date(),
      },
    })
    .catch((error) => {
      console.warn('[VerificationService] Failed to stamp vehicle verification:', error);
    });
}

type SelectedVehicle = Awaited<ReturnType<typeof prisma.vehicle.findFirst>>;

const ENGINE_OFFLINE_CHECKS = [
  { id: 'documentType', label: 'Recognised as a supported document' },
  { id: 'nameMatch', label: 'Owner name matches your account' },
  { id: 'registrationMatch', label: 'Registration number matches your vehicle' },
  { id: 'validity', label: 'Document is currently valid' },
];

/**
 * The engine could not be reached, so nothing was checked.
 *
 * This is deliberately NEEDS_REVIEW rather than REJECTED, with every check marked
 * SKIPPED and zero confidence: the user's document was not examined, so we have
 * no grounds to fail it. Nothing is persisted and no vehicle is stamped.
 */
function engineUnavailableResult(
  payload: VerifyPayload,
  selectedVehicle: SelectedVehicle,
  error: unknown,
) {
  const reason =
    error instanceof Error && error.name === 'TimeoutError'
      ? 'The verification engine did not respond in time. Your document was not checked.'
      : 'The verification engine is unavailable. Your document was not checked.';

  const documents = payload.files.map((file, index) => ({
    filename: file.name || `Document_${index + 1}`,
    documentType: 'UNKNOWN',
    status: 'NEEDS_REVIEW' as const,
    confidenceScore: 0,
    extractedFields: { documentType: 'UNKNOWN' },
    checks: {
      formatValid: false,
      registrationMatch: false,
      nameMatch: false,
      expiryCheck: false,
    },
    summary: reason,
    documentTypeLabel: 'Not checked',
    statusLabel: 'Not checked',
    engineStatus: 'PROCESSING_ERROR',
    engineAvailable: false,
    confidenceLabel: 'Unknown',
    checkResults: ENGINE_OFFLINE_CHECKS.map((check) => ({
      ...check,
      status: 'SKIPPED' as const,
      rawStatus: 'SKIPPED',
      detail: 'Not checked -- the verification engine was unavailable.',
    })),
    fields: [],
    diagnostics: { failureReason: reason },
  }));

  return {
    success: true,
    verificationId: `ver_offline_${crypto.randomBytes(4).toString('hex')}`,
    engineVersion: 'unavailable',
    engineAvailable: false,
    overallStatus: 'NEEDS_REVIEW' as const,
    overallConfidence: 0,
    documents,
    targetVehicle: selectedVehicle
      ? {
          id: selectedVehicle.id,
          registration: selectedVehicle.registration,
          make: selectedVehicle.make,
          model: selectedVehicle.model,
          type: selectedVehicle.type,
        }
      : null,
    summary: reason,
  };
}

export async function processDocumentVerification(payload: VerifyPayload) {
  if (!payload.files || payload.files.length === 0) {
    throw new VerificationError(
      400,
      'At least one document image must be uploaded.',
      'NO_DOCUMENTS',
    );
  }

  if (payload.files.length > MAX_FILES_PER_REQUEST) {
    throw new VerificationError(
      400,
      `At most ${MAX_FILES_PER_REQUEST} documents can be verified per request.`,
      'TOO_MANY_FILES',
    );
  }

  for (const file of payload.files) {
    decodeVerificationFile(file);
  }

  let selectedVehicle = null;
  let targetReg = payload.expectedRegistration;
  let targetName = payload.expectedName;

  if (payload.vehicleId) {
    selectedVehicle = await prisma.vehicle.findFirst({
      where: {
        id: payload.vehicleId,
        userId: payload.userId,
      },
    });
    if (selectedVehicle) {
      targetReg = selectedVehicle.registration;
    }
  }

  const aiEngineUrl = process.env.AI_VERIFICATION_URL || 'http://127.0.0.1:8000/verify-documents';

  try {
    const formData = new FormData();
    if (targetReg) formData.append('expectedRegistration', targetReg);
    if (targetName) formData.append('expectedName', targetName);

    for (let i = 0; i < payload.files.length; i++) {
      const file = payload.files[i];
      let base64Content = file.data;
      if (base64Content.includes(',')) {
        base64Content = base64Content.split(',')[1];
      }
      const buffer = Buffer.from(base64Content, 'base64');
      const blob = new Blob([buffer], { type: 'image/jpeg' });
      formData.append('files', blob, file.name || `document_${i + 1}.jpg`);
    }

    const headers: Record<string, string> = {};
    if (process.env.AI_ENGINE_API_KEY) {
      headers['X-API-Key'] = process.env.AI_ENGINE_API_KEY;
    }

    const aiRes = await fetch(aiEngineUrl, {
      method: 'POST',
      headers,
      body: formData,
      // Without this a hung socket blocks until the browser's own abort, which
      // on a demo looks like the app freezing rather than the engine failing.
      signal: AbortSignal.timeout(AI_ENGINE_TIMEOUT_MS),
    });

    if (!aiRes.ok) {
      // Previously this fell out of the `if (aiRes.ok)` block without throwing and
      // silently slid into the bridge path, so a 500 from the engine looked like a
      // verification result. Fail loudly instead.
      throw new Error(`AI engine responded ${aiRes.status} ${aiRes.statusText}`);
    }

    const aiData = await aiRes.json();
    // An outage is not a verdict: never stamp a vehicle or write an audit row
    // off the back of documents the engine never actually looked at.
    if (aiData.engineAvailable !== false) {
      void persistVerification({
        userId: payload.userId,
        vehicleId: payload.vehicleId,
        overallStatus: aiData.overallStatus ?? 'NEEDS_REVIEW',
        overallConfidence: Number(aiData.overallConfidence) || 0,
        summary: aiData.summary ?? '',
        documents: aiData.documents ?? [],
      });
    }
    return {
      ...aiData,
      targetVehicle: selectedVehicle
        ? {
            id: selectedVehicle.id,
            registration: selectedVehicle.registration,
            make: selectedVehicle.make,
            model: selectedVehicle.model,
            type: selectedVehicle.type,
          }
        : null,
    };
  } catch (error) {
    console.warn('[VerificationService] AI engine call failed:', error);

    // The bridge runs a different pipeline and, without an OCR engine installed,
    // returns OCR_FAILED for every image -- which the UI renders as a confident
    // red rejection of a perfectly valid document. Telling a user their real RC
    // is fake because our service is down is a wrong answer, not a strict one.
    // Off by default; opt in only where the bridge is known to work.
    if (process.env.VERIFICATION_BRIDGE_FALLBACK !== 'true') {
      return engineUnavailableResult(payload, selectedVehicle, error);
    }
  }

  const docs = await Promise.all(payload.files.map(async (file, idx) => {
    const filename = file.name || `Document_${idx + 1}`;
    const originalName = sanitizeFilename(filename) || `document_${idx + 1}`;
    const tempFilePath = path.join(os.tmpdir(), `verify_${crypto.randomBytes(8).toString('hex')}_${originalName}`);

    try {
      fs.writeFileSync(tempFilePath, decodeVerificationFile(file));
      const bridgeResult = await VerificationService.verifyDocument(
        tempFilePath,
        originalName,
        {
          name: targetName || '',
          vehicle_registration_number: targetReg,
        },
      );
      return normalizeBridgeDocument(bridgeResult, originalName, targetReg);
    } catch (error) {
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn('[VerificationService] Failed to cleanup fallback temp file:', cleanupError);
        }
      }

      return {
        filename: originalName,
        documentType: 'INVALID_DOCUMENT',
        status: 'REJECTED' as const,
        confidenceScore: 0,
        extractedFields: {
          documentType: 'INVALID_DOCUMENT',
          documentNumber: undefined,
          ownerName: undefined,
          vehicleNumber: undefined,
          vehicleClass: undefined,
          issueDate: undefined,
          expiryDate: undefined,
          issuingAuthority: undefined,
        },
        checks: {
          formatValid: false,
          registrationMatch: false,
          nameMatch: false,
          expiryCheck: false,
        },
        summary: 'Verification engine could not process this document.',
      };
    }
  }));

  const hasRejection = docs.some((doc) => doc.status === 'REJECTED');
  const hasReview = docs.some((doc) => doc.status === 'NEEDS_REVIEW');
  const overallStatus = hasRejection ? 'REJECTED' : hasReview ? 'NEEDS_REVIEW' : 'VERIFIED';
  const overallConfidence = docs.length
    ? Number((docs.reduce((sum, doc) => sum + doc.confidenceScore, 0) / docs.length).toFixed(2))
    : 0;

  void persistVerification({
    userId: payload.userId,
    vehicleId: payload.vehicleId,
    overallStatus,
    overallConfidence,
    summary: hasRejection
      ? 'Verification failed. The uploaded image is not a valid RC Book or registration does not match.'
      : hasReview
        ? 'Documents processed. Details require manual verification.'
        : `All document(s) verified successfully against vehicle registration record.`,
    documents: docs,
  });

  return {
    success: true,
    verificationId: `ver_${Math.random().toString(36).substring(2, 9)}`,
    overallStatus,
    overallConfidence,
    documents: docs,
    targetVehicle: selectedVehicle
      ? {
          id: selectedVehicle.id,
          registration: selectedVehicle.registration,
          make: selectedVehicle.make,
          model: selectedVehicle.model,
          type: selectedVehicle.type,
        }
      : null,
    summary: hasRejection
      ? 'Verification failed. The uploaded image is not a valid RC Book or registration does not match.'
      : hasReview
        ? 'Documents processed. Details require manual verification.'
      : `All document(s) verified successfully against vehicle registration record.`,
  };
}

export interface AccountDataPayload {
  name: string;
  date_of_birth?: string | null;
  vehicle_registration_number?: string | null;
}

export interface VerificationResultResponse {
  status: 'VERIFIED' | 'MISMATCH' | 'PARTIALLY_MATCHED' | 'EXPIRED' | 'OCR_FAILED' | 'UNKNOWN_DOCUMENT' | 'PROCESSING_ERROR';
  document_type: 'DRIVING_LICENSE' | 'RC' | 'UNKNOWN';
  confidence: number;
  checks?: Record<string, string>;
  extracted_fields?: Record<string, string | null | undefined>;
  message?: string;
}

function resolveEngineDir(): string {
  const candidates = [
    path.join(process.cwd(), 'ai-verification-engine'),
    path.join(process.cwd(), '..', 'ai-verification-engine'),
  ];

  const engineDir = candidates.find((candidate) => fs.existsSync(path.join(candidate, 'bridge.py')));
  return engineDir || candidates[0];
}

function cleanRegistration(value?: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return cleaned || undefined;
}

function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function bridgeStatusToDocumentStatus(
  status: VerificationResultResponse['status'],
): 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED' {
  if (status === 'VERIFIED') return 'VERIFIED';
  if (status === 'PARTIALLY_MATCHED') return 'NEEDS_REVIEW';
  return 'REJECTED';
}

function checkValue(checks: Record<string, string> | undefined, key: string): boolean {
  const value = checks?.[key];
  return value === 'MATCH' || value === 'VALID' || value === 'true';
}

function normalizeBridgeDocument(
  result: VerificationResultResponse,
  filename: string,
  expectedRegistration?: string,
) {
  const extracted = result.extracted_fields || {};
  const documentType = result.document_type === 'RC'
    ? 'VEHICLE_RC'
    : result.document_type === 'DRIVING_LICENSE'
      ? 'DRIVING_LICENSE'
      : 'INVALID_DOCUMENT';
  // Only ever report what the document actually yielded. This used to fall back
  // to `expectedRegistration` -- the user's own garage value -- and present it as
  // "read from the document", so a failed extraction rendered as a cross-reference
  // PASS with two identical registration numbers while every check below it failed.
  const vehicleNumber = cleanRegistration(
    typeof extracted.vehicle_registration_number === 'string'
      ? extracted.vehicle_registration_number
      : undefined,
  );
  const formatValid = result.document_type !== 'UNKNOWN'
    && !['OCR_FAILED', 'UNKNOWN_DOCUMENT', 'PROCESSING_ERROR'].includes(result.status);

  return {
    filename,
    documentType,
    status: bridgeStatusToDocumentStatus(result.status),
    confidenceScore: result.confidence,
    extractedFields: {
      documentType,
      documentNumber: vehicleNumber,
      ownerName: typeof extracted.name === 'string' ? extracted.name : undefined,
      vehicleNumber,
      vehicleClass: undefined,
      issueDate: typeof extracted.valid_from === 'string' ? extracted.valid_from : undefined,
      expiryDate: typeof extracted.valid_until === 'string' ? extracted.valid_until : undefined,
      issuingAuthority: undefined,
    },
    checks: {
      formatValid,
      registrationMatch: checkValue(result.checks, 'vehicle_registration_number'),
      nameMatch: checkValue(result.checks, 'name'),
      expiryCheck: checkValue(result.checks, 'validity'),
    },
    summary: result.message || 'Document verification failed.',
  };
}

export class VerificationService {
  public static async verifyDocument(
    tempFilePath: string,
    originalFilename: string,
    accountData: AccountDataPayload,
  ): Promise<VerificationResultResponse> {
    const engineDir = resolveEngineDir();
    const pythonExecutable = path.join(engineDir, 'venv', 'bin', 'python');
    const bridgeScript = path.join(engineDir, 'bridge.py');

    const pythonPath = fs.existsSync(pythonExecutable) ? pythonExecutable : 'python3';

    try {
      const accountJsonStr = JSON.stringify(accountData);

      const { stdout, stderr } = await execFileAsync(pythonPath, [
        bridgeScript,
        '--document',
        tempFilePath,
        '--account-json',
        accountJsonStr,
        '--filename',
        originalFilename,
      ]);

      if (stderr && !stdout) {
        console.error('[VerificationService] Bridge stderr:', stderr);
      }

      const result: VerificationResultResponse = JSON.parse(stdout.trim());
      return result;
    } catch (error) {
      console.error('[VerificationService] Error calling verification engine:', error);
      return {
        status: 'PROCESSING_ERROR',
        document_type: 'UNKNOWN',
        confidence: 0.0,
        message: 'Verification service encountered an internal processing error.',
      };
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.error('[VerificationService] Failed to cleanup temp file:', err);
        }
      }
    }
  }
}
