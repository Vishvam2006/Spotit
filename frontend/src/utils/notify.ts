import toast from 'react-hot-toast';
import { getErrorMessage } from '../services/api';

const ERROR_DURATION_MS = 5000;

export function notifySuccess(message: string): void {
  toast.success(message);
}

export function notifyError(messageOrError: unknown): void {
  toast.error(
    typeof messageOrError === 'string' ? messageOrError : getErrorMessage(messageOrError),
    { duration: ERROR_DURATION_MS },
  );
}

export function notifyInfo(message: string): void {
  toast(message);
}