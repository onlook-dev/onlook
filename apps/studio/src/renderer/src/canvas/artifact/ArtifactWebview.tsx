import { useEffect, useRef, useState, type RefObject } from 'react';
import type { WebviewTag } from 'electron';
import { ARTIFACTS_PARTITION } from '@studio/events';
import { createArtifactRefresh } from './refresh.js';
import { noteGuestAttached, noteGuestGone } from '../frameFacts.js';
import { bindGuestReady } from '../frame/guestReady.js';
import { artifactSnapshots } from './snapshots.js';
import { bindArtifactSnapshot } from './snapshotGuest.js';
import { useFrameAttachUrl } from '../frame/useFrameAttachUrl.js';

export function ArtifactWebview({ url, revision, snapshotRevision, cover, webviewRef, nodeId, onPainted }: {
  url: string;
  revision?: string;
  snapshotRevision?: string;
  cover?: string;
  nodeId?: string;
  webviewRef?: RefObject<WebviewTag | null>;
  /** Which revision painted, never a bare flag: the parent compares it against the one it is asking about (ONL-2791). */
  onPainted?: (paintedRevision: string | null) => void;
}): React.JSX.Element {
  const local = useRef<WebviewTag>(null);
  const guest = webviewRef ?? local;
  const refresh = useRef<ReturnType<typeof createArtifactRefresh> | null>(null);
  const keyRevision = snapshotRevision ?? revision ?? '';
  const snapshotKey = `${nodeId ?? ''}:${url}:${keyRevision}`;
  const attachUrl = useFrameAttachUrl(nodeId, url, 'artifact');
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const snapshot = artifactSnapshots.peek(snapshotKey);
  const painted = loaded === snapshotKey;
  useEffect(() => {
    const contents = guest.current;
    if (!contents) return;
    const controller = createArtifactRefresh(() => contents.reload());
    refresh.current = controller;
    const ready = () => {
      controller.ready();
      if (nodeId !== undefined) noteGuestAttached(nodeId, contents.getWebContentsId());
    };
    const gone = () => { if (nodeId !== undefined) noteGuestGone(nodeId); };
    const unbindReady = bindGuestReady(contents, ready);
    contents.addEventListener('destroyed', gone);
    return () => {
      unbindReady();
      contents.removeEventListener('destroyed', gone);
      gone();
      refresh.current = null;
    };
  }, [guest, url, nodeId, attachUrl]);
  useEffect(() => { refresh.current?.update(revision); }, [revision, url, guest, attachUrl]);
  useEffect(() => {
    const contents = guest.current;
    if (!contents || nodeId === undefined) return;
    return bindArtifactSnapshot(contents, snapshotKey, url, setLoaded);
  }, [guest, url, nodeId, snapshotKey, attachUrl]);
  // A page that stopped loading never reports loaded, so its cover would stand forever (ONL-2791).
  useEffect(() => {
    const contents = guest.current;
    if (!contents) return;
    const stopped = (event: Electron.DidFailLoadEvent) => { if (event.isMainFrame && event.errorCode !== -3) setFailed(snapshotKey); };
    contents.addEventListener('did-fail-load', stopped);
    return () => { contents.removeEventListener('did-fail-load', stopped); };
  }, [guest, snapshotKey, attachUrl]);
  useEffect(() => { onPainted?.(painted ? keyRevision : null); }, [onPainted, painted, keyRevision]);
  return <>{attachUrl !== undefined && <webview
    key={attachUrl}
    ref={guest}
    src={attachUrl}
    partition={ARTIFACTS_PARTITION}
    className="nodrag nopan nowheel"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    data-testid="artifact-webview"
  />}{cover !== undefined && !painted && failed !== snapshotKey && <img
    src={cover}
    alt=""
    draggable={false}
    data-testid="artifact-cover"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', pointerEvents: 'none' }}
  />}{snapshot && !painted && <img
    src={snapshot.image}
    alt=""
    draggable={false}
    data-testid="artifact-snapshot"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
  />}</>;
}
