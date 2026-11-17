import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { t } from '@studio/i18n';
import { GlyphOpenPrompt } from '../icons/glyphs.js';
import type { PromptId, TipPrompt } from './content.js';
import { LOOP_MS, PREVIEW_CLASS, STAGES } from './previews.js';
import { AMBIENT_GAP_MS, AMBIENT_LEAD_MS, bindScrub, type ScrubController } from './scrub.js';

export type ScrubRegistry = Map<PromptId, ScrubController>;

export function tileStyle(prompt: TipPrompt): CSSProperties {
  return { '--loop': `${LOOP_MS}ms`, '--tint': prompt.tint } as CSSProperties;
}

// One object per prompt: React rewrites `innerHTML` on a re-render with a new object, which replaces the animations a scrub drives.
const MARKUP = new Map<PromptId, { __html: string }>();

function previewMarkup(id: PromptId): { __html: string } {
  let markup = MARKUP.get(id);
  if (markup === undefined) {
    markup = { __html: STAGES[id]() };
    MARKUP.set(id, markup);
  }
  return markup;
}

export interface PromptGridProps {
  prompts: readonly TipPrompt[];
  query: string;
  scrubs: ScrubRegistry;
  /** The grid holds its idle motion while a detail view covers it. */
  isCovered: boolean;
  /** A closed dialog renders its content hidden, and a hidden element has no CSS animations to drive. */
  isShown: boolean;
  onOpen: (id: PromptId, tile: HTMLElement) => void;
}

export function PromptGrid({ prompts, query, scrubs, isCovered, isShown, onOpen }: PromptGridProps): React.JSX.Element {
  const gridRef = useRef<HTMLDivElement>(null);

  // Kept across pauses, so the stagger resumes with the next card instead of starting over.
  const cursor = useRef(0);
  useEffect(() => {
    if (isCovered) return;
    const tick = (): void => {
      const grid = gridRef.current;
      if (grid === null) return;
      const live = [...scrubs.values()];
      if (live.length === 0 || live.some((s) => s.isHovered())) return;
      const fold = grid.getBoundingClientRect();
      const visible = [...grid.querySelectorAll<HTMLElement>('[data-tips-card]')].filter((card) => {
        const r = card.getBoundingClientRect();
        return r.bottom > fold.top && r.top < fold.bottom;
      });
      if (visible.length === 0) return;
      const card = visible[cursor.current % visible.length];
      cursor.current += 1;
      scrubs.get(card?.dataset.tipsCard as PromptId)?.ambient();
    };
    // The first pass comes soon after the grid shows, then the slow rhythm takes over.
    let due = performance.now() + AMBIENT_LEAD_MS;
    const clock = setInterval(() => {
      if (performance.now() < due) return;
      due += AMBIENT_GAP_MS;
      tick();
    }, 100);
    return () => {
      clearInterval(clock);
    };
  }, [isCovered, scrubs]);

  return (
    <div ref={gridRef} className="tips-grid" data-testid="tips-grid">
      {prompts.length === 0 ? (
        <div className="tips-empty">{t('tips.empty.prompts', { query })}</div>
      ) : (
        prompts.map((prompt) => <PromptCard key={prompt.id} prompt={prompt} scrubs={scrubs} isShown={isShown} onOpen={onOpen} />)
      )}
    </div>
  );
}

function PromptCard({
  prompt,
  scrubs,
  isShown,
  onOpen,
}: {
  prompt: TipPrompt;
  scrubs: ScrubRegistry;
  isShown: boolean;
  onOpen: PromptGridProps['onOpen'];
}): React.JSX.Element {
  const cardRef = useRef<HTMLButtonElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const title = t(prompt.title);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const tile = tileRef.current;
    if (card === null || tile === null || !isShown) return;
    const scrub = bindScrub(card, tile);
    scrubs.set(prompt.id, scrub);
    return () => {
      scrub.dispose();
      if (scrubs.get(prompt.id) === scrub) scrubs.delete(prompt.id);
    };
  }, [prompt.id, scrubs, isShown]);

  return (
    <button
      ref={cardRef}
      type="button"
      className="tips-card"
      data-tips-card={prompt.id}
      aria-label={t('tips.open', { title })}
      onClick={() => {
        if (tileRef.current !== null) onOpen(prompt.id, tileRef.current);
      }}
    >
      {/* Static illustration markup; no user data reaches it. */}
      <div
        ref={tileRef}
        className={PREVIEW_CLASS}
        style={tileStyle(prompt)}
        aria-hidden="true"
        dangerouslySetInnerHTML={previewMarkup(prompt.id)}
      />
      <span className="tips-card-head">
        <span className="tips-card-title">{title}</span>
        <GlyphOpenPrompt mode="raw" className="tips-card-arrow" size={14} />
      </span>
    </button>
  );
}
