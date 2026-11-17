import { useEffect, useRef, useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { SHIMMER_CREST_ALPHA, SHIMMER_CREST_FRACTION, SHIMMER_PERIOD_CH, SHIMMER_SWEEP_MS } from '@studio/chat-ui';
import type { ArtifactSummary } from '@studio/events';
import { RenameField } from '../../RenameField.js';
import { t } from '@studio/i18n';
import { renameArtifactTitle } from './listing.js';

/** The title's own type and one line of it, so editing moves nothing (ONL-2593). */
const FIELD_IN_PLACE: React.CSSProperties = { display: 'block', font: 'inherit', fontWeight: 'inherit', lineHeight: 'inherit', height: '1lh' };

const FIELD_FITS_TEXT = { ...FIELD_IN_PLACE, display: 'inline-block', verticalAlign: 'top', width: 'auto', minWidth: '4ch', fieldSizing: 'content' } as React.CSSProperties;

const SHIMMER_STYLE = `
@keyframes studio-artifact-title-sweep {
  from { background-position-x: 0; }
  to { background-position-x: ${String(SHIMMER_PERIOD_CH)}ch; }
}
[data-artifact-shimmer] {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  color: transparent;
  background-image: linear-gradient(90deg,
    transparent calc(50% - ${String(SHIMMER_PERIOD_CH * SHIMMER_CREST_FRACTION)}ch),
    color-mix(in srgb, var(--color-text-primary) ${String(SHIMMER_CREST_ALPHA)}%, transparent) 50%,
    transparent calc(50% + ${String(SHIMMER_PERIOD_CH * SHIMMER_CREST_FRACTION)}ch)),
    linear-gradient(var(--color-text-secondary), var(--color-text-secondary));
  background-size: ${String(SHIMMER_PERIOD_CH)}ch 100%;
  background-clip: text;
  animation: studio-artifact-title-sweep ${String(SHIMMER_SWEEP_MS)}ms linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  [data-artifact-shimmer] {
    animation: none;
    background-image: none;
    color: var(--color-text-secondary);
  }
}
`;

function TitleInk({ label, isShimmering }: { label: string; isShimmering: boolean }): React.ReactNode {
  if (!isShimmering) return label;
  return <><style href="studio-artifact-title-shimmer" precedence="medium">{SHIMMER_STYLE}</style><span data-artifact-shimmer="">{label}</span></>;
}

function stopTitleKeys(event: React.KeyboardEvent<HTMLElement>): void {
  if (event.key === 'Enter' || event.key === 'Escape') event.stopPropagation();
}

/** On the canvas the field waits for the second click, and `detail` 0 is the keyboard's own activation, which has no second one (ONL-2645). */
export function renameOpensOnClick(detail: number, renameOnDoubleClick: boolean): boolean {
  return !renameOnDoubleClick || detail === 0;
}

/** `renameRequest` opens the field each time it rises; a remount does not replay it (ONL-2593). */
export function ArtifactTitle({artifact, label, renameRequest = 0, fitText = false, renameOnDoubleClick = false, isShimmering = false, draggable = false}: {artifact?: ArtifactSummary; label: string; renameRequest?: number; fitText?: boolean; renameOnDoubleClick?: boolean; isShimmering?: boolean; draggable?: boolean}): React.JSX.Element {
  const [editing, setEditing] = useState<ArtifactSummary | null>(null);
  const handledRequest = useRef(renameRequest);
  useEffect(() => {
    if (renameRequest === handledRequest.current) return;
    handledRequest.current = renameRequest;
    if (artifact && !artifact.readOnly) setEditing(artifact);
  }, [renameRequest, artifact]);
  const [pending, setPending] = useState(false);
  const disabled = !artifact || artifact.readOnly || pending;
  const [failed, setFailed] = useState(false);
  const current = useRef(0);
  const commit = async (title: string): Promise<void> => {
    const target = editing;
    setEditing(null);
    if (!target || !artifact || target.id !== artifact.id || target.readOnly || title.trim() === '' || title.trim() === target.title || pending) return;
    const token = ++current.current;
    setPending(true);
    setFailed(false);
    try {
      const saved = await renameArtifactTitle(target.id, title);
      if (current.current === token) setFailed(!saved);
    } finally {
      if (current.current === token) setPending(false);
    }
  };
  return <span className={draggable && !editing ? 'artifact-title' : 'nodrag nopan artifact-title'} data-testid="artifact-title">
    {editing ? <RenameField initialValue={editing.title} label={t('artifact.rename.label')} testId="artifact-title-input" style={fitText ? FIELD_FITS_TEXT : FIELD_IN_PLACE} onKeyDown={stopTitleKeys} onCommit={(title) => {void commit(title);}} onCancel={() => setEditing(null)} />
      : <button type="button" data-testid="artifact-title-button" aria-label={t('artifact.rename.label')} disabled={disabled} onKeyDown={stopTitleKeys} onPointerDown={draggable ? undefined : (event) => event.stopPropagation()} onClick={(event) => {event.stopPropagation(); if (!renameOpensOnClick(event.detail, renameOnDoubleClick)) return; setFailed(false); if (artifact) setEditing(artifact);}} onDoubleClick={(event) => {event.stopPropagation(); if (renameOnDoubleClick && artifact) {setFailed(false); setEditing(artifact);}}} title={artifact?.readOnly ? t('artifact.library.readOnly') : t('artifact.rename.label')} style={{border: 0, background: 'transparent', color: 'inherit', font: 'inherit', padding: 0, verticalAlign: 'top', height: '1lh', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'inherit', width: '100%', cursor: draggable ? 'grab' : artifact?.readOnly ? 'default' : 'text', pointerEvents: draggable && disabled ? 'none' : undefined}}><TitleInk label={label} isShimmering={isShimmering} /></button>}
    {failed && <Text size="2xs" role="alert">{t('artifact.rename.failed')}</Text>}
  </span>;
}
