import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { WebviewTag } from 'electron';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { ARTIFACT_SCHEME, ARTIFACTS_PARTITION, artifactSummaryPages, type ArtifactPageState, type ArtifactSummary } from '@studio/events';
import { t } from '@studio/i18n';
import { subscribeArtifact } from './artifactCache.js';
import { requestLivePageState } from './livePageState.js';
import './gallery.css';
import { studio } from '../../bridge.js';

export function ArtifactLivePage({ artifact, pagePath, onNavigate }: { artifact: ArtifactSummary; pagePath: string; onNavigate(path: string): void }): React.JSX.Element {
  const guest = useRef<WebviewTag>(null);
  const generation = useRef(0);
  const deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ArtifactPageState | {outcome: 'reading'}>({outcome: 'reading'});
  const [loading, setLoading] = useState(true);
  useEffect(() => subscribeArtifact(artifact.id, () => setAttempt((value) => value + 1)), [artifact.id]);
  useEffect(() => {
    generation.current += 1;
    setState({outcome: 'reading'});
    setLoading(true);
    const request = requestLivePageState(() => studio().artifactPageState({artifactId: artifact.id, pagePath, updatedAt: artifact.updatedAt}), setState);
    deadline.current = request.timer;
    return request.cancel;
  }, [artifact.id, artifact.updatedAt, pagePath, attempt]);
  const url = state.outcome === 'ready' ? state.url : undefined;
  const followNavigation = useEffectEvent((destinationUrl: string): void => {
    try {
      const destination = new URL(destinationUrl);
      const path = decodeURIComponent(destination.pathname.slice(1));
      const known = artifactSummaryPages(artifact).some((page) => page.path === path);
      if (destination.protocol !== `${ARTIFACT_SCHEME}:` || destination.host !== artifact.id || !known) setState({outcome: 'unavailable'});
      else if (path !== pagePath) onNavigate(path);
    } catch { setState({outcome: 'unavailable'}); }
  });
  useEffect(() => {
    const contents = guest.current;
    if (!contents || !url) return;
    const token = generation.current;
    const current = () => generation.current === token && guest.current === contents;
    const finished = () => { if (current()) {clearTimeout(deadline.current); setLoading(false);} };
    const failed = (event: Electron.DidFailLoadEvent) => {
      if (current() && event.isMainFrame && event.errorCode !== -3) {clearTimeout(deadline.current); setState({outcome: 'unavailable'});}
    };
    const navigated = (event: Electron.DidNavigateEvent) => { if (current()) followNavigation(event.url); };
    contents.addEventListener('did-finish-load', finished);
    contents.addEventListener('did-fail-load', failed);
    contents.addEventListener('did-navigate', navigated);
    return () => {
      contents.removeEventListener('did-finish-load', finished);
      contents.removeEventListener('did-fail-load', failed);
      contents.removeEventListener('did-navigate', navigated);
    };
    // The webview's key: each remount is a new element that needs its own listeners.
  }, [url, artifact.updatedAt, attempt]);
  return <div data-testid="artifact-live-page" style={{ position: 'relative', height: 'min(62vh, 700px)', minHeight: 160, width: '100%', overflow: 'hidden', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', background: 'var(--color-background-muted)' }}>
    {url && <webview key={`${url}:${artifact.updatedAt}:${attempt}`} ref={guest} src={url} partition={ARTIFACTS_PARTITION} data-testid="artifact-viewer-webview" style={{ display: 'flex', width: '100%', height: '100%' }} />}
    {(!url || loading) && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', gap: 'var(--spacing-3)', pointerEvents: url ? 'none' : 'auto' }}>
      <Text size="sm" color="secondary" role="status">{t(state.outcome === 'reading' || url ? 'artifact.preview.loading' : state.outcome === 'missing' ? 'artifact.preview.missing' : 'artifact.preview.unavailable')}</Text>
    </div>}
    {!url && state.outcome !== 'reading' && <div className="artifact-preview-retry"><Button label={t('artifact.preview.retry')} size="sm" variant="secondary" onClick={() => setAttempt((value) => value + 1)} /></div>}
  </div>;
}
