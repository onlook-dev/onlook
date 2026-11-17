import { useEffect, useState } from 'react';
import { ignoreRefusal } from '../../refusal.js';
import { studio } from '../../bridge.js';

export function useFrameAttachUrl(nodeId: string | undefined, url: string, instance: string | number, enabled = true): string | undefined {
  const key = JSON.stringify([nodeId, url, instance, enabled]);
  const [lease, setLease] = useState<{ key: string; url: string } | null>(null);
  const request = typeof window === 'undefined' ? undefined : studio()?.canvasFrameAttach;
  useEffect(() => {
    if (!enabled) { setLease(null); return; }
    if (nodeId === undefined || request === undefined) return;
    let active = true;
    void request({ nodeId }).then(result => {
      if (active) setLease({ key, url: result?.url ?? url });
    }).catch(error => { ignoreRefusal('canvas', 'canvasFrameAttach')(error); if (active) setLease({ key, url }); });
    return () => { active = false; };
  }, [nodeId, url, key, request, enabled]);
  if (!enabled) return undefined;
  if (nodeId === undefined || request === undefined) return url;
  return lease?.key === key ? lease.url : undefined;
}
