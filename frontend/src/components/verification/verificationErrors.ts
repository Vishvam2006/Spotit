import { getApiErrorCode, getApiFailureKind, isNetworkError } from '../../services/api';

/**
 * Turns any thrown verification failure into controlled, user-facing copy.
 *
 * The backend attaches a structured `code` (see VerificationError and the
 * upload middleware) which we map to a friendly title + what-to-do-next line.
 * Raw backend, AI or provider messages are never surfaced: an unknown code or
 * a transport failure falls through to a generic, safe message.
 */
export interface FriendlyError {
  /** Short headline, e.g. "File is too large". */
  title: string;
  /** One line: what went wrong and how to fix it. */
  message: string;
}

const CODE_MESSAGES: Record<string, FriendlyError> = {
  NO_DOCUMENTS: {
    title: 'No document added',
    message: 'Add a photo or PDF of your RC or licence before verifying.',
  },
  TOO_MANY_FILES: {
    title: 'Too many files',
    message: 'You can verify up to 10 documents at a time. Remove a few and try again.',
  },
  EMPTY_FILE: {
    title: 'That file is empty',
    message: 'The file has no content. Choose the document again and re-upload it.',
  },
  FILE_TOO_LARGE: {
    title: 'File is too large',
    message: 'Each document must be 15MB or smaller. Try a smaller photo or a compressed PDF.',
  },
  INVALID_FILE_TYPE: {
    title: 'Unsupported file',
    message: "Upload a JPG, PNG, WEBP or PDF. Other file types can't be read.",
  },
  CORRUPTED_FILE: {
    title: "That file couldn't be read",
    message: 'It looks incomplete or corrupted. Re-take the photo or export the PDF again.',
  },
  INVALID_UPLOAD: {
    title: 'Upload failed',
    message: 'Something was wrong with the upload. Choose the file again and retry.',
  },
  VERIFICATION_ERROR: {
    title: 'Verification failed',
    message: "We couldn't process that document. Please check the image and try again.",
  },
  INTERNAL_ERROR: {
    title: 'Something went wrong',
    message: 'The verification service ran into a problem. Please try again in a moment.',
  },
};

const NETWORK: FriendlyError = {
  title: 'You appear to be offline',
  message: 'Check your internet connection and try again.',
};

const TIMEOUT: FriendlyError = {
  title: 'This took too long',
  message:
    "The document couldn't be verified in time. Please try again — a clearer, smaller image is faster to read.",
};

const AUTH: FriendlyError = {
  title: 'Your session expired',
  message: 'Please log in again to verify your document.',
};

const SERVER: FriendlyError = {
  title: 'Verification is temporarily unavailable',
  message:
    'Our verification service is having trouble right now. Your document was not rejected — please try again shortly.',
};

const GENERIC: FriendlyError = {
  title: 'Verification failed',
  message: "We couldn't verify that document. Please check the image and try again.",
};

export function describeVerificationError(error: unknown): FriendlyError {
  const code = getApiErrorCode(error);
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  if (isNetworkError(error)) return NETWORK;

  const kind = getApiFailureKind(error);
  if (kind === 'timeout') return TIMEOUT;
  if (kind === 'auth') return AUTH;
  if (kind === 'server') return SERVER;

  return GENERIC;
}
