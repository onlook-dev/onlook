// Listens on the document; canvas `<webview>` frames are a hole — a drag that ENTERS the window already over a guest reaches no host element, and no `will-navigate` guard exists in main (ONL-1981).
// The canvas's own seat runs in the capture phase and stops a drag or drop over its region, so these listeners never see one: exactly one target is lit (ONL-2486).

import { useEffect, useRef, useState } from 'react';
import { useLatestRef } from '../useLatestRef.js';
import {
  dragCarriesFiles,
  dragCarriesImages,
  dragWouldNavigate,
  foldDragDepth,
} from './imageDrop.js';

function itemsOf(dataTransfer: DataTransfer | null): { kind: string; type: string }[] {
  if (!dataTransfer) return [];
  return Array.from(dataTransfer.items, (item) => ({ kind: item.kind, type: item.type }));
}

export function useEditorImageDrop(
  onFiles: (files: File[]) => void,
  isEnabled: boolean,
): boolean {
  const [isDropping, setIsDropping] = useState(false);
  const depth = useRef(0);
  // `dragleave` is gated on this, not the leaving event's `dataTransfer`: a leave does not reliably carry its enter's items, and a skipped decrement leaves the composer lit for the rest of the mount.
  const counting = useRef(false);
  const latest = useLatestRef({ onFiles, isEnabled });

  useEffect(() => {
    const reset = (): void => {
      depth.current = 0;
      counting.current = false;
      setIsDropping(false);
    };

    const onDragEnter = (event: DragEvent): void => {
      const items = itemsOf(event.dataTransfer);
      if (!dragWouldNavigate(items)) return;
      event.preventDefault();
      if (!dragCarriesFiles(items)) return;
      counting.current = true;
      depth.current = foldDragDepth(depth.current, 'enter');
      if (latest.current.isEnabled && dragCarriesImages(items)) setIsDropping(true);
    };

    const onDragOver = (event: DragEvent): void => {
      const items = itemsOf(event.dataTransfer);
      if (!dragWouldNavigate(items)) return;
      // Without this the drop never fires; dragenter alone still lights the composer.
      event.preventDefault();
      if (!event.dataTransfer) return;
      // `copy` for every accepted file drag, not only images: `none` cancels and no `drop` event fires, which kills the unlabelled-file case.
      event.dataTransfer.dropEffect =
        latest.current.isEnabled && dragCarriesFiles(items) ? 'copy' : 'none';
    };

    const onDragLeave = (): void => {
      if (!counting.current) return;
      depth.current = foldDragDepth(depth.current, 'leave');
      if (depth.current === 0) reset();
    };

    const onDrop = (event: DragEvent): void => {
      const items = itemsOf(event.dataTransfer);
      if (!dragWouldNavigate(items)) return;
      event.preventDefault();
      const files = event.dataTransfer ? Array.from(event.dataTransfer.files) : [];
      reset();
      if (!latest.current.isEnabled || files.length === 0) return;
      latest.current.onFiles(files);
    };

    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
    // `blur` is the recovery edge: `dragend` goes to the drag's source node, which for a file from Finder is not in this document.
    document.addEventListener('dragend', reset);
    window.addEventListener('blur', reset);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('drop', onDrop);
      document.removeEventListener('dragend', reset);
      window.removeEventListener('blur', reset);
    };
  }, []);

  return isDropping;
}
