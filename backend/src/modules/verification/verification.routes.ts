import { Router, type Request, type Response, type NextFunction } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate } from '../../middleware/auth.middleware';
import { verifyHandler, verifyDocumentHandler } from './verification.controller';

const router = Router();

const MAX_TOTAL_BYTES = Number(process.env.MAX_UPLOAD_TOTAL_BYTES) || 25 * 1024 * 1024;
const MAX_FILE_BYTES = Number(process.env.MAX_UPLOAD_FILE_BYTES) || 15 * 1024 * 1024;
const MAX_PARTS = 20;

const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);

function sanitizeFilename(name: string): string {
  const base = path.basename(name);
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return safe || 'document.bin';
}

function hasAllowedExtension(name: string): boolean {
  const ext = path.extname(name).slice(1).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Native lightweight multipart/form-data parser for document uploads.
 * Enforces request/file size limits, a strict mimetype + extension
 * whitelist and filename sanitization (path traversal prevention), and
 * guarantees temp file cleanup even on abort/error.
 */
function uploadDocumentMiddleware(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    next();
    return;
  }

  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) {
    res.status(400).json({ success: false, message: 'Invalid multipart boundary' });
    return;
  }

  const boundary = match[1] || match[2];
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  let tooLarge = false;

  req.on('data', (chunk: Buffer) => {
    totalBytes += chunk.length;
    if (totalBytes > MAX_TOTAL_BYTES) {
      tooLarge = true;
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('error', () => {
    // Nothing to clean up yet: files are written only in 'end'.
  });

  req.on('aborted', () => {
    // Part files are cleaned up by the middleware below if already written;
    // nothing else holds resources here.
    req.destroy();
  });

  req.on('end', () => {
    if (tooLarge) {
      res
        .status(413)
        .json({ success: false, message: 'Upload is too large. Maximum allowed size is 25MB.' });
      return;
    }

    let uploadedFile: { path: string; originalname: string; mimetype: string } | undefined;

    const finishWithError = (status: number, message: string) => {
      if (uploadedFile && fs.existsSync(uploadedFile.path)) {
        try {
          fs.unlinkSync(uploadedFile.path);
        } catch {
          // best-effort cleanup
        }
      }
      res.status(status).json({ success: false, message });
    };

    try {
      const buffer = Buffer.concat(chunks);
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const parts: Buffer[] = [];

      let start = 0;
      let partCount = 0;
      while (start < buffer.length) {
        const idx = buffer.indexOf(boundaryBuffer, start);
        if (idx === -1) break;
        if (start > 0) {
          parts.push(buffer.subarray(start, idx));
          partCount += 1;
          if (partCount > MAX_PARTS) {
            finishWithError(400, 'Too many multipart parts.');
            return;
          }
        }
        start = idx + boundaryBuffer.length;
      }

      let bodyParams: Record<string, string> = {};

      for (const part of parts) {
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;

        const headerStr = part.subarray(0, headerEnd).toString('utf-8');
        let bodyBuffer = part.subarray(headerEnd + 4);

        if (
          bodyBuffer.length >= 2 &&
          bodyBuffer.subarray(bodyBuffer.length - 2).toString() === '\r\n'
        ) {
          bodyBuffer = bodyBuffer.subarray(0, bodyBuffer.length - 2);
        }

        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

        if (!nameMatch) continue;

        if (filenameMatch) {
          if (uploadedFile) {
            finishWithError(400, 'Only a single document file is allowed per request.');
            return;
          }

          if (bodyBuffer.length === 0) {
            finishWithError(400, 'Uploaded file is empty.');
            return;
          }

          if (bodyBuffer.length > MAX_FILE_BYTES) {
            finishWithError(413, 'Uploaded file is too large. Maximum allowed size is 15MB.');
            return;
          }

          const rawName = filenameMatch[1];
          const mimetype = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';

          if (!ALLOWED_MIMETYPES.has(mimetype)) {
            finishWithError(
              400,
              'Unsupported file type. Allowed: JPG, PNG, WEBP, PDF.',
            );
            return;
          }

          if (!hasAllowedExtension(rawName) && !hasAllowedExtension(sanitizeFilename(rawName))) {
            finishWithError(
              400,
              'Unsupported file extension. Allowed: .jpg, .jpeg, .png, .webp, .pdf.',
            );
            return;
          }

          const safeName = sanitizeFilename(rawName);
          const tempFileName = `verify_${crypto.randomBytes(8).toString('hex')}_${safeName}`;
          const tempFilePath = path.join(os.tmpdir(), tempFileName);

          fs.writeFileSync(tempFilePath, bodyBuffer);

          uploadedFile = {
            path: tempFilePath,
            originalname: safeName,
            mimetype,
          };
        } else {
          bodyParams[nameMatch[1]] = bodyBuffer.toString('utf-8').trim();
        }
      }

      if (!uploadedFile) {
        finishWithError(400, 'A document file is required.');
        return;
      }

      req.file = uploadedFile;
      req.body = { ...req.body, ...bodyParams };

      const cleanup = () => {
        if (fs.existsSync(uploadedFile!.path)) {
          try {
            fs.unlinkSync(uploadedFile!.path);
          } catch {
            // best-effort
          }
        }
      };
      res.on('finish', cleanup);
      res.on('close', cleanup);
      req.on('aborted', cleanup);

      next();
    } catch (err) {
      console.error('[UploadMiddleware] Parse error:', err);
      finishWithError(500, 'Failed to process document upload');
    }
  });
}

router.post('/verify', authenticate, verifyHandler);

router.post(
  '/document',
  authenticate,
  uploadDocumentMiddleware,
  verifyDocumentHandler,
);

export default router;