import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { WebviewTag } from 'electron';
import type { ArtifactTextTarget } from '@studio/events';
import { t } from '@studio/i18n';
import { useCanvasStore } from '../store.js';
import { isGestureInFlight } from '../frame/useFramePicker.js';
import { isArtifactPickerLive } from './useArtifactPicker.js';
import { textEditFailure } from './ArtifactTextEditor.js';
import { studio } from '../../bridge.js';

export function useArtifactTextEditing(nodeId: string, guestRef: RefObject<WebviewTag | null>, url: string | undefined, updatedAt: string | undefined, revision: string) {
  const live = useCanvasStore((state) => isArtifactPickerLive(state, nodeId));
  const mode = useCanvasStore((state) => state.mode);
  const tool = useCanvasStore((state) => state.tool);
  const exporting = useCanvasStore((state) => state.isExportMode);
  const epoch = useRef(0);
  const currentKey = `${nodeId}:${url ?? ''}:${updatedAt ?? ''}:${revision}:${mode}:${tool}:${String(exporting)}`;
  const key = useRef(currentKey);
  const [editing, setEditing] = useState<{ target: ArtifactTextTarget; context: string; guest: WebviewTag; retired: boolean } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const currentGuest = guestRef.current;
  useLayoutEffect(() => {
    key.current = currentKey;
    epoch.current += 1;
    setPreparing(false);
    setEditing((current) => current !== null && !current.retired && (current.context !== currentKey || current.guest !== currentGuest) ? { ...current, retired: true } : current);
  }, [currentKey, live, currentGuest]);
  useEffect(() => () => { epoch.current += 1; }, []);
  const begin = useCallback((point: { x: number; y: number }): void => {
    const guest = guestRef.current;
    if (!guest || !url || updatedAt === undefined || editing !== null || !isArtifactPickerLive(useCanvasStore.getState(), nodeId) || isGestureInFlight()) return;
    const requestKey = key.current;
    const token = ++epoch.current;
    setPreparing(true);
    setRefusal(null);
    try {
      const guestId = guest.getWebContentsId();
      void studio().artifactTextPrepare({ nodeId, guestId, updatedAt, point }).then((result) => {
        if (epoch.current !== token || key.current !== requestKey || guestRef.current !== guest || !isArtifactPickerLive(useCanvasStore.getState(), nodeId) || isGestureInFlight()) return;
        if (result.outcome === 'editable') setEditing({ target: result.target, context: requestKey, guest, retired: false });
        else setRefusal(result.outcome === 'unsupported' ? t('artifact.text.unsupported') : result.outcome === 'unavailable' ? t('artifact.text.unavailable') : textEditFailure(result.outcome));
      }).catch(() => { if (epoch.current === token) setRefusal(t('artifact.text.unavailable')); }).finally(() => { if (epoch.current === token) setPreparing(false); });
    } catch { setPreparing(false); setRefusal(t('artifact.text.unavailable')); }
  }, [nodeId, guestRef, url, updatedAt, editing]);
  const close = useCallback(() => { epoch.current += 1; setEditing(null); setRefusal(null); setPreparing(false); }, []);
  const stale = editing !== null && (editing.retired || editing.context !== currentKey || currentGuest !== editing.guest);
  return { editing, preparing, refusal, stale, begin, close, dismissRefusal: () => setRefusal(null) };
}
