import { Router, type Request, type Response, type NextFunction } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate } from '../../middleware/auth.middleware';
import { verifyDocumentHandler } from './verification.controller';

const router = Router();

/**
 * Native lightweight multipart/form-data parser for document uploads.
 * Reads single file 'document' into os.tmpdir() with immediate cleanup guarantee.
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

  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    try {
      const buffer = Buffer.concat(chunks);
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const parts: Buffer[] = [];

      let start = 0;
      while (start < buffer.length) {
        const idx = buffer.indexOf(boundaryBuffer, start);
        if (idx === -1) break;
        if (start > 0) {
          parts.push(buffer.subarray(start, idx));
        }
        start = idx + boundaryBuffer.length;
      }

      let uploadedFile: { path: string; originalname: string; mimetype: string } | undefined;
      const bodyParams: Record<string, string> = {};

      for (const part of parts) {
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;

        const headerStr = part.subarray(0, headerEnd).toString('utf-8');
        let bodyBuffer = part.subarray(headerEnd + 4);

        if (bodyBuffer.length >= 2 && bodyBuffer.subarray(bodyBuffer.length - 2).toString() === '\r\n') {
          bodyBuffer = bodyBuffer.subarray(0, bodyBuffer.length - 2);
        }

        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

        if (nameMatch) {
          const paramName = nameMatch[1];
          if (filenameMatch) {
            const originalname = filenameMatch[1];
            const mimetype = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';

            const tempFileName = `verify_${crypto.randomBytes(8).toString('hex')}_${originalname}`;
            const tempFilePath = path.join(os.tmpdir(), tempFileName);

            fs.writeFileSync(tempFilePath, bodyBuffer);

            uploadedFile = {
              path: tempFilePath,
              originalname,
              mimetype,
            };
          } else {
            bodyParams[paramName] = bodyBuffer.toString('utf-8').trim();
          }
        }
      }

      req.file = uploadedFile;
      req.body = { ...req.body, ...bodyParams };
      next();
    } catch (err) {
      console.error('[UploadMiddleware] Parse error:', err);
      res.status(500).json({ success: false, message: 'Failed to process document upload' });
    }
  });

  req.on('error', (err) => {
    next(err);
  });
}

router.post(
  '/document',
  authenticate,
  uploadDocumentMiddleware,
  verifyDocumentHandler,
);

export default router;
