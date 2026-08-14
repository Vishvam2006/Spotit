import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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
  message?: string;
}

export class VerificationService {
  /**
   * Executes AI Verification Engine with strict zero-retention guarantee.
   * Temporary document file is deleted immediately after execution.
   */
  public static async verifyDocument(
    tempFilePath: string,
    originalFilename: string,
    accountData: AccountDataPayload,
  ): Promise<VerificationResultResponse> {
    const engineDir = path.join(process.cwd(), 'ai-verification-engine');
    const pythonExecutable = path.join(engineDir, 'venv', 'bin', 'python');
    const bridgeScript = path.join(engineDir, 'bridge.py');

    // Use system python if venv python does not exist
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
      // ABSOLUTE ZERO RETENTION GUARANTEE: Delete temp file immediately
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
