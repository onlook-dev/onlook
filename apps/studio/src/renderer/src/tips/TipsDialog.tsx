import { Dialog } from '../overlay/Dialog.js';
import { CharMorphText } from '@studio/chat-ui';
import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { useCanvasStore } from '../canvas/store.js';
import { requestComposerText } from '../chat/composerRequest.js';
import { t, type StringKey } from '@studio/i18n';
import { GlyphSearch, GlyphTipsHotkeys, GlyphTipsPrompts, OpenExternalIcon } from '../icons/glyphs.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { TABS, promptsFor, type PromptId, type PromptTab, type TipPrompt } from './content.js';
import { HotkeyList, filterHotkeys } from './HotkeyList.js';
import { HOTKEYS, shownHotkeys } from './hotkeys.js';
import { PANEL_HREF, PANEL_RULES } from '../panel/panelStyles.js';
import { useSettingsStore } from '../settings/store.js';
import { KeyCombo } from './KeyCombo.js';
import { PromptDetail, type PromptDetailHandle } from './PromptDetail.js';
import { PromptGrid, type ScrubRegistry } from './PromptGrid.js';
import { PREVIEW_HREF, PREVIEW_RULES } from './previews.js';
import {
  closeTips,
  setTipsDetail,
  setTipsQuery,
  setTipsTab,
  setTipsView,
  showTipsToast,
  useTipsStore,
  type TipsView,
} from './store.js';
import { TIPS_HREF, TIPS_RULES } from './styles.js';
import { openTour } from '../tour/store.js';
import { studio } from '../bridge.js';

const DOCS_URL = 'https://docs.onlook.com';


const TIPS_TESTIDS = { dialog: 'tips-dialog', search: 'tips-search' } as const;

const VIEW_TITLE: Record<TipsView, StringKey> = { prompts: 'tips.nav.prompts', hotkeys: 'tips.nav.hotkeys' };
const NAV = [
  { view: 'prompts', Glyph: GlyphTipsPrompts },
  { view: 'hotkeys', Glyph: GlyphTipsHotkeys },
] as const;

function choosePrompt(prompt: TipPrompt, key: StringKey): void {
  const text = t(key);
  // The composer lives in the Right Rail; a hidden rail would take the words out of sight.
  const canvas = useCanvasStore.getState();
  if (canvas.mode === 'interact') canvas.setMode('design');
  if (canvas.hiddenRails.right) canvas.toggleRail('right');
  requestComposerText(text);
  setTipsDetail(null);
  closeTips();
  showTipsToast(text);
  studio().telemetryEvent({ event: 'tips_prompt_chosen', properties: { ...telemetryProjectFields(), tip_id: prompt.id } });
}

export function TipsDialog(): React.JSX.Element {
  const isOpen = useTipsStore((s) => s.isOpen);
  const view = useTipsStore((s) => s.view);
  const tab = useTipsStore((s) => s.tab);
  const query = useTipsStore((s) => s.query);
  const detail = useTipsStore((s) => s.detail);
  return (
    <TipsDialogView
      isOpen={isOpen}
      view={view}
      tab={tab}
      query={query}
      detail={detail}
      onClose={closeTips}
      onView={setTipsView}
      onTab={setTipsTab}
      onQuery={setTipsQuery}
      onDetail={setTipsDetail}
      onChoose={choosePrompt}
    />
  );
}

export interface TipsDialogViewProps {
  isOpen: boolean;
  view: TipsView;
  tab: PromptTab;
  query: string;
  detail: PromptId | null;
  onClose: () => void;
  onView: (view: TipsView) => void;
  onTab: (tab: PromptTab) => void;
  onQuery: (query: string) => void;
  onDetail: (id: PromptId | null) => void;
  onChoose: (prompt: TipPrompt, key: StringKey) => void;
  /** Showroom only: renders without `showModal()` and its focus trap. */
  isInline?: boolean;
}

function filterPrompts(prompts: readonly TipPrompt[], query: string): TipPrompt[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [...prompts];
  return prompts.filter((p) => [p.title, p.blurb, ...p.tries].some((key) => t(key).toLowerCase().includes(q)));
}

export function TipsDialogView({
  isOpen,
  view,
  tab,
  query,
  detail,
  onClose,
  onView,
  onTab,
  onQuery,
  onDetail,
  onChoose,
  isInline,
}: TipsDialogViewProps): React.JSX.Element {
  const scrubs = useMemo<ScrubRegistry>(() => new Map(), []);
  const gridRootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<PromptDetailHandle>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  // The dialog hands focus back to the Tips pill on close; a key-driven close would ring it.
  useEffect(() => {
    if (isOpen) {
      shellRef.current?.focus({ preventScroll: true });
      return;
    }
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.dataset.testid === 'canvas-tips') active.blur();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isOpen]);

  const prompts = filterPrompts(promptsFor(tab), query);
  const order = prompts.map((p) => p.id);
  const codeEnabled = useSettingsStore((state) => state.experimentalCodePanel);
  const hotkeys = filterHotkeys(shownHotkeys(HOTKEYS, { codeEnabled }), query);

  const findTile = (id: PromptId): HTMLElement | null =>
    gridRootRef.current?.querySelector<HTMLElement>(`[data-tips-card="${id}"] .tips-tile`) ?? null;

  // Captured ahead of the dialog: Escape walks back out of search and the detail view before it closes anything.
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>): void => {
    const inSearch = event.target === searchRef.current;
    if (event.key === '/' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'Escape') {
      if (inSearch) {
        event.preventDefault();
        event.stopPropagation();
        if (query !== '') onQuery('');
        else searchRef.current?.blur();
        return;
      }
      if (detail !== null) {
        event.preventDefault();
        event.stopPropagation();
        detailRef.current?.close();
      }
      return;
    }
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && detail !== null && !inSearch) {
      event.preventDefault();
      detailRef.current?.step(event.key === 'ArrowRight' ? 1 : -1);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      {...(isInline === undefined ? {} : { isInline })}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width="min(1040px, 88vw)"
      maxHeight="86vh"
      padding={0}
      data-testid={TIPS_TESTIDS.dialog}
      // Which half is showing, as a fact: every label here is translatable, so none is a stable handle (ONL-2563).
      data-view={view}
    >
      <style href={PREVIEW_HREF} precedence="medium">
        {PREVIEW_RULES}
      </style>
      <style href={PANEL_HREF} precedence="medium">
        {PANEL_RULES}
      </style>
      <style href={TIPS_HREF} precedence="medium">
        {TIPS_RULES}
      </style>
      {/* Focus lands on the shell, not the first control: a dialog opened by a key would ring that control. */}
      <div ref={shellRef} className="panel-shell" tabIndex={-1} onKeyDownCapture={onKeyDownCapture}>
        <aside className="panel-side">
          <div className="panel-brand">{t('tips.heading')}</div>
          <nav className="panel-nav">
            {NAV.map(({ view: item, Glyph }) => (
              <button
                key={item}
                type="button"
                className="panel-nav-item"
                aria-current={item === view ? 'page' : undefined}
                onClick={() => {
                  onView(item);
                }}
              >
                <Glyph mode="raw" size={16} />
                {t(VIEW_TITLE[item])}
              </button>
            ))}
          </nav>
          {/* Takes the footer's push to the bottom, so the tour, docs and footer sit together (ONL-2744). */}
          <button
            type="button"
            className="panel-nav-item"
            style={{ marginTop: 'auto' }}
            onClick={() => {
              closeTips();
              openTour('tips');
            }}
            data-testid="tips-tour"
          >
            {t('tips.tour')}
          </button>
          <button
            type="button"
            className="panel-nav-item"
            style={{ justifyContent: 'space-between' }}
            onClick={() => {
              window.open(DOCS_URL, '_blank');
            }}
            data-testid="tips-docs-link"
          >
            {t('tips.docs')}
            <OpenExternalIcon />
          </button>
          <div className="panel-foot" style={{ marginTop: 0 }}>
            <span>{t('tips.footer')}</span>
            <span className="tips-key-combo">
              <KeyCombo keys="mod+/" />
            </span>
          </div>
        </aside>
        <div className="panel-main" ref={gridRootRef}>
          <div className="panel-head">
            <h1 className="panel-title">
              <CharMorphText>{t(VIEW_TITLE[view])}</CharMorphText>
            </h1>
            <label className="tips-search">
              <GlyphSearch mode="raw" size={14} />
              <input
                ref={searchRef}
                value={query}
                placeholder={t('tips.search')}
                aria-label={t('tips.search')}
                onChange={(event) => {
                  onQuery(event.target.value);
                }}
                data-testid={TIPS_TESTIDS.search}
              />
            </label>
          </div>
          {view === 'prompts' ? (
            <>
              <div className="tips-tabs" role="tablist">
                {TABS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    className="tips-tab"
                    aria-selected={entry.id === tab}
                    onClick={() => {
                      onTab(entry.id);
                    }}
                  >
                    {t(entry.label)}
                  </button>
                ))}
              </div>
              <PromptGrid
                prompts={prompts}
                query={query}
                scrubs={scrubs}
                isCovered={detail !== null || !isOpen}
                isShown={isOpen}
                onOpen={(id) => {
                  onDetail(id);
                }}
              />
              {detail === null ? null : (
                <PromptDetail
                  key={`detail-${tab}`}
                  id={detail}
                  order={order}
                  scrubs={scrubs}
                  findTile={findTile}
                  onClosed={() => {
                    onDetail(null);
                  }}
                  onStep={(id) => {
                    onDetail(id);
                  }}
                  onChoose={onChoose}
                  handleRef={detailRef}
                />
              )}
            </>
          ) : (
            <HotkeyList groups={hotkeys} query={query} />
          )}
        </div>
      </div>
    </Dialog>
  );
}
