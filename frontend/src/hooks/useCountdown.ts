import { useEffect, useRef, useState } from 'react';

/**
 * Ticks down to `targetTime` (ms epoch) once a second while `enabled`, and
 * fires `onDone` exactly once when it reaches zero. Shared by ArrivalCard's
 * check-in/session countdowns and the reassignment offer popup.
 */
export function useCountdown(
  targetTime: number,
  enabled: boolean,
  onDone: () => void,
): number {
  const [now, setNow] = useState(() => Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    doneRef.current = false;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetTime, enabled]);

  const remaining = Math.max(0, targetTime - now);

  useEffect(() => {
    if (enabled && remaining === 0 && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [enabled, remaining, onDone]);

  return remaining;
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
