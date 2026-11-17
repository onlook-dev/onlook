import { create } from 'zustand';
import { useEffect } from 'react';

export const useCameraMotion = create(() => ({ moving: false }));

let settleTimer: ReturnType<typeof setTimeout> | undefined;
let waitingToSettle = false;
let pointerHeld = false;

function cancelSettle(): void {
  clearTimeout(settleTimer);
  settleTimer = undefined;
}

function scheduleSettle(): void {
  cancelSettle();
  if (!waitingToSettle || pointerHeld) return;
  settleTimer = setTimeout(resetCameraMotion, 150);
}

export function beginCameraMotion(event?: { type: string } | null): void {
  cancelSettle();
  waitingToSettle = false;
  if (event?.type === 'mousedown' || event?.type === 'touchstart') pointerHeld = true;
  if (!useCameraMotion.getState().moving) useCameraMotion.setState({ moving: true });
}

export function endCameraMotion(_event?: { type: string } | null): void {
  if (!useCameraMotion.getState().moving) return;
  waitingToSettle = true;
  scheduleSettle();
}

function releasePointer(event: MouseEvent | TouchEvent): void {
  if ('touches' in event && event.touches.length > 0) return;
  pointerHeld = false;
  scheduleSettle();
}

export function resetCameraMotion(): void {
  cancelSettle();
  waitingToSettle = false;
  pointerHeld = false;
  if (useCameraMotion.getState().moving) useCameraMotion.setState({ moving: false });
}

export function noteCameraMotion(): void {
  if (!useCameraMotion.getState().moving) useCameraMotion.setState({ moving: true });
  scheduleSettle();
}

export function useCameraMotionLifetime(): void {
  useEffect(() => {
    window.addEventListener('blur', resetCameraMotion);
    window.addEventListener('mouseup', releasePointer, true);
    window.addEventListener('touchend', releasePointer, true);
    window.addEventListener('touchcancel', releasePointer, true);
    return () => {
      window.removeEventListener('blur', resetCameraMotion);
      window.removeEventListener('mouseup', releasePointer, true);
      window.removeEventListener('touchend', releasePointer, true);
      window.removeEventListener('touchcancel', releasePointer, true);
      resetCameraMotion();
    };
  }, []);
}
