import { useEffect, useEffectEvent, useState } from 'react';
import { ignoreRefusal } from '../../refusal.js';
import { studio } from '../../bridge.js';

export function useFrameAttachUrl(nodeId: string | undefined, url: string, instance: string | number, enabled = true, onRefused?: (reason: 'blocked' | 'unavailable') => void): string | undefined {
  const key = JSON.stringify([nodeId, url, instance, enabled]);
  const [lease, setLease] = useState<{ key: string; url: string } | null>(null);
  const request = typeof window === 'undefined' ? undefined : studio()?.canvasFrameAttach;
  const refused = useEffectEvent((reason: 'blocked' | 'unavailable') => onRefused?.(reason));
  useEffect(() => {
    if (!enabled) { setLease(null); return; }
    if (nodeId === undefined || request === undefined) return;
    let active = true;
    const disconnect = studio().onCanvasFrameBlocked?.((event) => {
      if (active && event.nodeId === nodeId) refused('blocked');
    });
    void request({ nodeId }).then(result => {
      if (!active) return;
      if (result === null) refused('unavailable');
      else setLease({ key, url: result.url });
    }).catch((error: unknown) => {
      if (active) refused('unavailable');
      ignoreRefusal('canvas', 'canvasFrameAttach')(error);
    });
    return () => { active = false; disconnect?.(); };
  }, [nodeId, url, key, request, enabled]);
  if (!enabled) return undefined;
  if (nodeId === undefined || request === undefined) return url;
  return lease?.key === key ? lease.url : undefined;
}
