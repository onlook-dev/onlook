import { useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from 'react';
import { t, type StringKey } from '@studio/i18n';
import { GlyphBack, GlyphTryPrompt } from '../icons/glyphs.js';
import { PROMPTS, TABS, type PromptId, type TipPrompt } from './content.js';
import { LOOP_MS, PREVIEW_CLASS, STAGES } from './previews.js';
import type { ScrubRegistry } from './PromptGrid.js';
import { tileStyle } from './PromptGrid.js';
import { prefersReducedMotion } from '../reducedMotion.js';
import { boxOf, fadeTo, fly, settleAnimations, ZOOM, type Box } from './zoom.js';

export interface PromptDetailHandle {
  close: () => void;
  step: (dir: 1 | -1) => void;
}

export interface PromptDetailProps {
  id: PromptId;
  /** The grid's order; ← → step through it. */
  order: readonly PromptId[];
  scrubs: ScrubRegistry;
  /** The grid tile the zoom starts from and returns to, by prompt. */
  findTile: (id: PromptId) => HTMLElement | null;
  onClosed: () => void;
  onStep: (id: PromptId) => void;
  onChoose: (prompt: TipPrompt, text: StringKey) => void;
  handleRef?: Ref<PromptDetailHandle>;
}

type Phase = 'open' | 'closing';

const STEP = { duration: 340, easing: ZOOM.easing } as const;
const GHOST = 'tips-step-ghost';

function promptOf(id: PromptId): TipPrompt {
  const prompt = PROMPTS.find((p) => p.id === id);
  if (prompt === undefined) throw new Error(`unknown prompt ${id}`);
  return prompt;
}

function categoryLabel(prompt: TipPrompt): string {
  const tab = TABS.find((entry) => entry.id === prompt.category);
  return tab === undefined ? '' : t(tab.label);
}

function paintTile(tile: HTMLElement, prompt: TipPrompt): void {
  tile.innerHTML = STAGES[prompt.id]();
  for (const [k, v] of Object.entries(tileStyle(prompt))) tile.style.setProperty(k, String(v));
}

export function PromptDetail({ id, order, scrubs, findTile, onClosed, onStep, onChoose, handleRef }: PromptDetailProps): React.JSX.Element {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLButtonElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const phase = useRef<Phase>('open');
  const shown = useRef<PromptId>(id);
  const pendingStep = useRef<1 | -1 | null>(null);
  const [bandId, setBandId] = useState(id);
  const prompt = promptOf(bandId);

  const surface = (): string => getComputedStyle(rootRef.current ?? document.body).getPropertyValue('--panel-surface').trim() || 'transparent';

  const settle = (): void => {
    if (rootRef.current !== null) settleAnimations(rootRef.current);
    if (stageRef.current !== null) stageRef.current.style.height = '';
    const src = findTile(shown.current);
    if (src !== null) src.style.visibility = '';
  };

  // The zoom in: drawn at its final place, then played from the grid tile's box, at the grid tile's moment.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const tile = tileRef.current;
    if (root === null || stage === null || tile === null) return;
    const opened = promptOf(id);
    paintTile(tile, opened);
    const scrub = scrubs.get(id);
    if (scrub !== undefined) {
      const at = scrub.time() % LOOP_MS;
      scrub.setFrozen(true);
      for (const a of tile.getAnimations({ subtree: true })) a.currentTime = at;
    }
    const src = findTile(id);
    if (src === null || prefersReducedMotion()) return;
    const to = boxOf(tile);
    stage.style.height = `${to.height}px`;
    const from = boxOf(src);
    src.style.visibility = 'hidden';
    root.animate([{ backgroundColor: 'transparent' }, { backgroundColor: surface() }], { ...ZOOM, fill: 'forwards' }).id = 'tips-fade-backgroundColor';
    if (backRef.current !== null) {
      backRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 120, fill: 'backwards' }).id = 'tips-fade-opacity';
    }
    if (bandRef.current !== null) {
      bandRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 140, easing: ZOOM.easing, fill: 'backwards' }).id =
        'tips-fade-opacity';
    }
    fly(tile, from, to, () => {
      if (phase.current === 'open') settle();
    });
    // Once per mount: a step swaps content in place and never re-zooms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A step's text band slides the same way as its preview, a shorter distance.
  useLayoutEffect(() => {
    const dir = pendingStep.current;
    const band = bandRef.current;
    if (dir === null || band === null || prefersReducedMotion()) return;
    pendingStep.current = null;
    band.animate([{ opacity: 0, transform: `translateX(${dir * 32}px)` }, { opacity: 1, transform: 'none' }], STEP);
  }, [bandId]);

  const close = (): void => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const tile = tileRef.current;
    const scrub = scrubs.get(shown.current);
    const src = findTile(shown.current);
    if (root === null || stage === null || tile === null || src === null || prefersReducedMotion()) {
      scrub?.setFrozen(false);
      settle();
      onClosed();
      return;
    }
    phase.current = 'closing';
    const from = boxOf(tile);
    if (stage.style.height === '') stage.style.height = `${from.height}px`;
    src.style.visibility = 'hidden';
    const to = boxOf(src);
    if (bandRef.current !== null) fadeTo(bandRef.current, 'opacity', '0', { duration: 160 });
    if (backRef.current !== null) fadeTo(backRef.current, 'opacity', '0', { duration: 160 });
    fadeTo(root, 'backgroundColor', 'transparent', { duration: ZOOM.duration });
    fly(tile, from, to, () => {
      if (phase.current !== 'closing') return;
      const live = tile.getAnimations({ subtree: true }).find((a) => a.id !== 'tips-fly');
      if (scrub !== undefined) {
        if (live?.currentTime != null) scrub.seek(Number(live.currentTime) % LOOP_MS);
        scrub.setFrozen(false);
        scrub.setQuiet(true);
      }
      settle();
      onClosed();
    });
  };

  const reopen = (): void => {
    const root = rootRef.current;
    const tile = tileRef.current;
    if (root === null || tile === null) return;
    phase.current = 'open';
    const from: Box = boxOf(tile);
    for (const a of tile.getAnimations()) if (a.id === 'tips-fly') a.cancel();
    const to = boxOf(tile);
    if (bandRef.current !== null) fadeTo(bandRef.current, 'opacity', '1');
    if (backRef.current !== null) fadeTo(backRef.current, 'opacity', '1');
    fadeTo(root, 'backgroundColor', surface(), { duration: ZOOM.duration });
    fly(tile, from, to, () => {
      if (phase.current === 'open') settle();
    });
  };

  const step = (dir: 1 | -1): void => {
    if (phase.current !== 'open' || order.length < 2) return;
    const tile = tileRef.current;
    const root = rootRef.current;
    if (tile === null || root === null) return;
    const i = order.indexOf(shown.current);
    const nextId = order[(i + dir + order.length) % order.length];
    if (nextId === undefined) return;
    settle();
    scrubs.get(shown.current)?.setFrozen(false);
    scrubs.get(nextId)?.setFrozen(true);
    for (const ghost of root.querySelectorAll(`.${GHOST}`)) ghost.remove();

    const reduced = prefersReducedMotion();
    const oldDemo = tile.firstElementChild as HTMLElement | null;
    const band = bandRef.current;
    if (!reduced && band !== null) {
      const ghostBand = band.cloneNode(true) as HTMLElement;
      ghostBand.classList.add(GHOST);
      Object.assign(ghostBand.style, {
        position: 'absolute',
        top: `${band.offsetTop}px`,
        left: `${band.offsetLeft}px`,
        width: `${band.offsetWidth}px`,
        pointerEvents: 'none',
      });
      root.append(ghostBand);
      ghostBand.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 32}px)` }], {
        ...STEP,
        duration: 220,
        fill: 'forwards',
      }).onfinish = () => ghostBand.remove();
    }

    const next = promptOf(nextId);
    const holder = document.createElement('div');
    holder.innerHTML = STAGES[nextId]();
    const newDemo = holder.firstElementChild as HTMLElement | null;
    for (const [k, v] of Object.entries(tileStyle(next))) tile.style.setProperty(k, String(v));
    if (newDemo !== null) tile.append(newDemo);
    if (oldDemo !== null) {
      if (reduced) oldDemo.remove();
      else {
        const span = tile.offsetWidth * 0.25;
        oldDemo.style.pointerEvents = 'none';
        oldDemo.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * span}px)` }], {
          ...STEP,
          duration: 220,
          fill: 'forwards',
        }).onfinish = () => oldDemo.remove();
        newDemo?.animate([{ opacity: 0, transform: `translateX(${dir * span}px)` }, { opacity: 1, transform: 'none' }], STEP);
      }
    }

    shown.current = nextId;
    pendingStep.current = dir;
    setBandId(nextId);
    onStep(nextId);
  };

  useImperativeHandle(handleRef, () => ({ close, step }));

  return (
    <section ref={rootRef} className="tips-detail" data-testid="tips-detail">
      <button ref={backRef} type="button" className="tips-back" onClick={close}>
        <GlyphBack mode="raw" size={14} />
        {t('tips.back')}
      </button>
      <button
        ref={stageRef}
        type="button"
        className="tips-stage"
        aria-label={t('tips.closePreview')}
        onClick={() => {
          if (phase.current === 'closing') reopen();
          else close();
        }}
      >
        <div ref={tileRef} className={PREVIEW_CLASS} aria-hidden="true" />
      </button>
      <div ref={bandRef} className="tips-band">
        <div className="tips-band-info">
          <div className="tips-cat">{categoryLabel(prompt)}</div>
          <h2 className="tips-detail-title">{t(prompt.title)}</h2>
          <p className="tips-body">{t(prompt.body)}</p>
        </div>
        <div className="tips-band-act">
          <div className="tips-try-label">{t('tips.trySaying')}</div>
          {prompt.tries.map((key) => (
            <button key={key} type="button" className="tips-try" onClick={() => onChoose(prompt, key)}>
              <span>{t(key)}</span>
              <GlyphTryPrompt mode="raw" size={14} />
            </button>
          ))}
          <button
            type="button"
            className="tips-primary"
            onClick={() => {
              const first = prompt.tries[0];
              if (first !== undefined) onChoose(prompt, first);
            }}
          >
            {t('tips.tryInChat')}
          </button>
        </div>
      </div>
    </section>
  );
}
