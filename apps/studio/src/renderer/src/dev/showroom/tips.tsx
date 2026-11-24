import { useState } from 'react';
import type { PromptId, PromptTab } from '../../tips/content.js';
import type { TipsView } from '../../tips/store.js';
import { TipsDialogView } from '../../tips/TipsDialog.js';
import { noop, type Category, type Gallery, type Story } from './Showroom.js';

function Guide({ view = 'prompts', query: initialQuery = '', isInline = true, codeEnabled = false }: { view?: TipsView; query?: string; isInline?: boolean; codeEnabled?: boolean }): React.JSX.Element {
  const [current, setView] = useState<TipsView>(view);
  const [tab, setTab] = useState<PromptTab>('featured');
  const [query, setQuery] = useState(initialQuery);
  const [detail, setDetail] = useState<PromptId | null>(null);
  return (
    <TipsDialogView
      isOpen
      view={current}
      tab={tab}
      query={query}
      detail={detail}
      codeEnabled={codeEnabled}
      onClose={noop}
      onView={setView}
      onTab={setTab}
      onQuery={setQuery}
      onDetail={setDetail}
      onChoose={noop}
      isInline={isInline}
    />
  );
}

function story(id: string, title: string, note: string, render: Story['render']): Story {
  return { id: `tips-gallery-${id}`, title, note, render };
}

const CATEGORIES: Category[] = [
  {
    id: 'guide',
    title: 'The Tips guide (ONL-2468)',
    stories: [
      story('prompts', 'Prompts', 'click a card to zoom into its detail; ← → step', () => <Guide />),
      { ...story('hotkeys', 'Hotkeys', 'grouped, two columns', (context) => <Guide view="hotkeys" isInline={!context?.isIsolated} />), wide: true },
      { ...story('hotkeys-code', 'Hotkeys with Code', 'all shortcut groups fit in two columns', (context) => <Guide view="hotkeys" codeEnabled isInline={!context?.isIsolated} />), wide: true },
      { ...story('hotkeys-code-1280', 'Hotkeys with Code at 1280 × 800', 'all rows visible in a smaller window', (context) => context?.isIsolated
        ? <Guide view="hotkeys" codeEnabled isInline={false} />
        : <div style={{ width: 1280, height: 800, display: 'grid', placeItems: 'center' }}><Guide view="hotkeys" codeEnabled isInline /></div>), wide: true },
      story('empty', 'No match', 'a search with no prompt behind it', () => <Guide query="zebra" />),
    ],
  },
];

export const TIPS_GALLERY: Gallery = {
  id: 'tips',
  title: 'Tips',
  subtitle: 'The canvas guide: prompts with animated previews, and the hotkeys.',
  categories: CATEGORIES,
};
