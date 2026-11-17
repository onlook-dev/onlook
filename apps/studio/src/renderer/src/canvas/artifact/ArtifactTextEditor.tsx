import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { ARTIFACT_TEXT_MAX_LENGTH, type ArtifactTextSaveResult, type ArtifactTextTarget } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { MENU_PANEL } from '../../menu/surface.js';
import { LAYER } from '../../overlay/layers.js';

export function textEditKeyAction(key: string, shift: boolean, composing: boolean): 'save' | 'cancel' | 'none' {
  if (composing) return 'none';
  if (key === 'Escape') return 'cancel';
  return key === 'Enter' && !shift ? 'save' : 'none';
}

export function textEditFailure(outcome: Exclude<ArtifactTextSaveResult['outcome'], 'saved'>): string {
  const keys = {
    stale: 'artifact.text.stale',
    unsupported: 'artifact.text.unsupportedSave',
    readOnly: 'artifact.text.readOnly',
    unavailable: 'artifact.text.failed',
  } satisfies Record<typeof outcome, StringKey>;
  return t(keys[outcome]);
}

export function ArtifactTextRefusal({ message, zoom = 1, onDismiss }: { message: string; zoom?: number; onDismiss(): void }): React.JSX.Element {
  return <div className="nodrag nopan nowheel" data-testid="artifact-text-refusal" role="status" onPointerDown={(event) => event.stopPropagation()} style={{ ...MENU_PANEL, backgroundColor: 'var(--color-background-card)', position: 'absolute', top: 8, left: 8, zIndex: LAYER.card, maxWidth: 320, padding: 'var(--spacing-3)', color: 'var(--color-text-primary)', transform: `scale(${1 / Math.max(zoom, 0.05)})`, transformOrigin: 'top left' }}>
    <Text size="sm">{message}</Text>
    <Button label={t('artifact.text.dismiss')} size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); onDismiss(); }} />
  </div>;
}

export function ArtifactTextEditorSurface({ target, value, pending, error, stale, blocked = false, zoom = 1, fieldRef, onChange, onSave, onCancel, onBlur, onKeyDown, onComposition }: {
  target: ArtifactTextTarget;
  value: string;
  pending: boolean;
  error: string | null;
  stale: boolean;
  blocked?: boolean;
  zoom?: number;
  fieldRef?: RefObject<HTMLTextAreaElement | null>;
  onChange(value: string): void;
  onSave(): void;
  onCancel(): void;
  onBlur?(event: React.FocusEvent<HTMLDivElement>): void;
  onKeyDown?(event: React.KeyboardEvent<HTMLTextAreaElement>): void;
  onComposition?(composing: boolean): void;
}): React.JSX.Element {
  const scale = 1 / Math.max(zoom, 0.05);
  const { rect, style } = target;
  const message = stale ? t('artifact.text.stale') : error;
  return <div
    className="nodrag nopan nowheel"
    data-testid="artifact-text-editor"
    role="presentation"
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.stopPropagation()}
    onBlur={onBlur}
    style={{ position: 'absolute', left: rect.x, top: rect.y, width: Math.max(rect.width, 32), zIndex: LAYER.card }}
  >
    <textarea
      ref={fieldRef}
      data-testid="artifact-text-input"
      aria-label={t('artifact.text.label')}
      aria-invalid={message !== null}
      value={value}
      maxLength={ARTIFACT_TEXT_MAX_LENGTH}
      readOnly={pending || stale || blocked}
      spellCheck={false}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      onCompositionStart={() => onComposition?.(true)}
      onCompositionEnd={() => onComposition?.(false)}
      style={{ ...style, textAlign: style.textAlign as CSSProperties['textAlign'], display: 'block', boxSizing: 'border-box', width: '100%', height: Math.max(rect.height, 24), minHeight: '1lh', margin: 0, padding: 0, border: 0, borderRadius: 0, outline: `${2 * scale}px solid var(--color-accent)`, outlineOffset: 0, resize: 'none', overflow: 'auto', cursor: 'text' }}
    />
    <div style={{ ...MENU_PANEL, backgroundColor: 'var(--color-background-card)', position: 'absolute', top: `calc(100% + ${6 * scale}px)`, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left', minWidth: 240, maxWidth: 320, padding: 'var(--spacing-2)', color: 'var(--color-text-primary)' }}>
      {message !== null && <Text size="sm" role="alert" data-testid="artifact-text-error">{message}</Text>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
        <Button label={t('artifact.text.cancel')} size="sm" variant="ghost" isDisabled={pending} onClick={onCancel} data-testid="artifact-text-cancel" />
        <Button label={t(pending ? 'artifact.text.saving' : 'artifact.text.save')} size="sm" variant="secondary" isDisabled={pending || stale || blocked} onClick={onSave} data-testid="artifact-text-save" />
      </div>
      {!stale && !blocked && <Text type="supporting" color="secondary">{t('artifact.text.hint')}</Text>}
    </div>
  </div>;
}

export function ArtifactTextEditor({ target, stale, zoom, onSave, onDone, onCancel }: {
  target: ArtifactTextTarget;
  stale: boolean;
  zoom?: number;
  onSave(value: string): Promise<ArtifactTextSaveResult>;
  onDone(): void;
  onCancel(): void;
}): React.JSX.Element {
  const field = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const saving = useRef(false);
  const composing = useRef(false);
  const cancelled = useRef(false);
  const [draft, setDraft] = useState(target.text);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<'stale' | 'readOnly' | null>(null);
  const retired = stale || refusal === 'stale';
  useLayoutEffect(() => { field.current?.focus(); field.current?.select(); }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const commit = async (): Promise<void> => {
    if (saving.current || cancelled.current || composing.current || retired || refusal === 'readOnly') return;
    saving.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await onSave(draft);
      if (!mounted.current) return;
      if (result.outcome === 'saved') { onDone(); return; }
      setError(textEditFailure(result.outcome));
      if (result.outcome === 'stale' || result.outcome === 'readOnly') setRefusal(result.outcome);
    } catch {
      if (mounted.current) setError(t('artifact.text.failed'));
    } finally {
      saving.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const cancel = (): void => {
    if (saving.current) return;
    cancelled.current = true;
    onCancel();
  };
  return <ArtifactTextEditorSurface
    target={target}
    value={draft}
    pending={pending}
    error={error}
    stale={retired}
    blocked={refusal === 'readOnly'}
    {...(zoom === undefined ? {} : { zoom })}
    fieldRef={field}
    onChange={(value) => { setDraft(value); setError(null); }}
    onSave={() => { void commit(); }}
    onCancel={cancel}
    onComposition={(value) => { composing.current = value; }}
    onKeyDown={(event) => {
      const action = textEditKeyAction(event.key, event.shiftKey, composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229);
      if (action === 'none') return;
      event.preventDefault();
      event.stopPropagation();
      if (action === 'save') void commit();
      else cancel();
    }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && error === null) void commit(); }}
  />;
}
