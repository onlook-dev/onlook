import { useLayoutEffect, useRef, useState } from 'react';
import type { EffortLevel } from '@studio/events';
import { ModelEffortMenu } from '../../chat/ModelEffortMenu.js';
import { composerControls } from '../../chat/composerControls.js';
import { COMPOSER_TRIGGER_STYLE } from '../../menu/composerMenuRow.js';
import { modelMarkIcon } from '../../icons/glyphs.js';
import { FIXTURE_MODELS } from '../ChatFixture.js';
import type { Category } from './Showroom.js';

function ReasoningMenu({ state }: { state: string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState(state === 'selected' ? 'opus' : 'sonnet');
  const [effort, setEffort] = useState<EffortLevel | undefined>('medium');
  const controls = composerControls({ harness: 'claude', models: FIXTURE_MODELS, model, effort, setModel, setEffort: (level) => setEffort(level ?? undefined) });
  useLayoutEffect(() => {
    const trigger = root.current?.querySelector<HTMLButtonElement>('button');
    if (state === 'default' || state === 'left' || state === 'right') return;
    if (state === 'focus') {
      trigger?.focus();
      return;
    }
    if (state === 'hover') {
      trigger?.setAttribute('data-reasoning-hover', 'true');
      return;
    }
    trigger?.click();
    if (state === 'open') return;
    const frame = requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>('[data-testid="chat-model-row"][data-value="opus"]');
      row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    return () => cancelAnimationFrame(frame);
  }, [state]);
  return <div ref={root} data-testid="reasoning-menu-stage" style={{ position: 'fixed', bottom: 80, ...(state === 'right' ? { left: 400 } : { right: 24 }) }}>
    <style>{'[data-reasoning-hover="true"] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }'}</style>
    <ModelEffortMenu icon={modelMarkIcon('claude')} label={controls.combinedLabel} size={18} testId="chat-model-effort" modelRows={controls.modelRows} isDisabled={false} buttonStyle={COMPOSER_TRIGGER_STYLE} />
  </div>;
}

export const REASONING_MENU_CATEGORY: Category = {
  id: 'reasoning-menu', title: 'Model reasoning — diagonal pointer travel',
  stories: ['default', 'hover', 'focus', 'open', 'selected', 'left', 'right'].map((state) => ({
    id: `reasoning-menu-${state}`, title: state, render: () => <ReasoningMenu state={state} />,
  })),
};
