import { useRef, useState } from 'react';
import { GIT_PILL_SHIPPED_DEFAULTS, IDLE_UPDATE_STATE, MAX_PROJECT_TABS, PANEL_DEFAULTS, type UpdateState } from '@studio/events';
import { MEASUREMENT_FIXTURES, row } from '@studio/git-ui/measurement-fixtures';

import { REGION } from '../../layout.js';
import { ParkedScreen } from '../../ParkedScreen.js';
import { UpdatePillView } from '../../chrome/UpdatePill.js';
import { TAB_HEIGHT } from '../../chrome/tabs/geometry.js';
import { TabStrip, type TabStripProps } from '../../chrome/tabs/TabStrip.js';
import { TabPreviewCard } from '../../chrome/tabs/TabPreviewCard.js';
import type { StudioTab } from '../../chrome/tabs/Tab.js';
import { noop, type Category, type Gallery } from './Showroom.js';

const ACTIVE_NAME = 'Website refresh 2026 – making';
const WORKING_NAME = 'ONL-1543 - Expand the chat to';
const REST_NAME = 'ONL-4043 - Revamp the guard';

function tab(id: string, name: string, isWorking = false): StudioTab {
  return isWorking ? { id, name, isWorking } : { id, name };
}

const DEAD = [tab('t1', ACTIVE_NAME), { ...tab('t2', REST_NAME), health: 'gone' as const }, tab('t3', REST_NAME)];

function series(count: number): StudioTab[] {
  return [
    tab('t1', ACTIVE_NAME),
    ...Array.from({ length: count - 1 }, (_, index) => tab(`t${index + 2}`, REST_NAME)),
  ];
}

const FOUR = series(4);
const SIX = series(6);
const MANY = series(14);
const SHIMMERING = [tab('t1', ACTIVE_NAME), tab('t2', WORKING_NAME, true), tab('t3', REST_NAME), tab('t4', REST_NAME)];
const LONG = [
  tab('t1', 'Rewrite the onboarding flow so a returning designer lands in their last project'),
  tab('t2', REST_NAME),
  tab('t3', REST_NAME),
];
const SHORT = [tab('t1', 'Home'), tab('t2', 'Pricing'), tab('t3', 'Docs')];
const PREVIEW_IMAGE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="273" height="140"><rect width="273" height="140" fill="#181818"/><rect x="12" y="12" width="80" height="116" rx="6" fill="#333"/><rect x="104" y="12" width="157" height="54" rx="6" fill="#2b4c7e"/><rect x="104" y="78" width="157" height="50" rx="6" fill="#333"/></svg>')}`;

function Ground({ width, children }: { width: number; children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      style={{
        width,
        maxWidth: 'calc(100vw - 560px)',
        height: TAB_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--studio-band)',
      }}
    >
      {children}
    </div>
  );
}

function LiveStrip({
  width,
  initial,
  ...rest
}: { width: number; initial: readonly StudioTab[] } & Partial<TabStripProps>): React.JSX.Element {
  const [tabs, setTabs] = useState<readonly StudioTab[]>(initial);
  const [activeTabId, setActiveTabId] = useState(initial[0]?.id ?? '');
  /* Monotonic, never the list length: after a close, length re-mints an id still on screen. */
  const minted = useRef(initial.length);
  return (
    <Ground width={width}>
      <TabStrip
        canCreate
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onClose={(id) => setTabs((current) => current.filter((entry) => entry.id !== id))}
        onNew={() => {
          minted.current += 1;
          const next = tab(`t${minted.current}`, REST_NAME);
          setTabs((current) => [...current, next]);
          setActiveTabId(next.id);
        }}
        onRename={(id, name) =>
          setTabs((current) => current.map((entry) => (entry.id === id ? { ...entry, name } : entry)))
        }
        {...rest}
      />
    </Ground>
  );
}

function Forced({ width, tabs, ...rest }: { width: number; tabs: readonly StudioTab[] } & Partial<TabStripProps>): React.JSX.Element {
  return (
    <Ground width={width}>
      <TabStrip canCreate tabs={tabs} activeTabId="t1" onSelect={noop} onClose={noop} onNew={noop} onRename={noop} {...rest} />
    </Ground>
  );
}

const STAGE = 900;
/** The design master's strip width, row plus `+`. */
const MASTER = 1204;

function MenuSwapStrip(): React.JSX.Element {
  const [count, setCount] = useState(MAX_PROJECT_TABS - 1);
  return (
    <div>
      <Forced width={MASTER} tabs={series(count)} onNewDraft={noop} onPreview={() => Promise.reject(new Error('Preview unavailable'))} />
      <button type="button" data-testid="tabs-gallery-reach-limit" onClick={() => setCount(MAX_PROJECT_TABS)}>Reach the tab limit</button>
    </div>
  );
}

const CATEGORIES: Category[] = [
  {
    id: 'tab-previews',
    title: 'Tab hover previews',
    stories: [
      ...(['create-pr', 'upload-changes', 'checks-running', 'local-only'] as const).map((state) => ({
        id: `tabs-preview-${state}`,
        title: state,
        render: () => (
          <div style={{ width: 280, height: 240, transform: 'translateZ(0)' }}>
            <TabPreviewCard name="Project" left={8} now={0} preview={{ git: {
              row: row(MEASUREMENT_FIXTURES[state]), defaults: GIT_PILL_SHIPPED_DEFAULTS,
            } }} />
          </div>
        ),
      })),
      {
        id: 'tabs-preview-no-snapshot',
        title: 'No snapshot',
        render: () => (
          <div style={{ width: 280, height: 240, transform: 'translateZ(0)' }}>
            <TabPreviewCard name="Project" left={8} now={0} preview={{}} />
          </div>
        ),
      },
    ],
  },
  {
    id: 'health',
    title: 'Health — a view that died (ONL-2352)',
    stories: [
      {
        id: 'tabs-gallery-health-gone',
        title: 'a dead tab',
        note: 'the ✕ slot holds Reload, always shown — a dead renderer cannot draw its own',
        render: () => <Forced width={STAGE} tabs={DEAD} onReload={noop} />,
      },
    ],
  },
  {
    id: 'creating',
    title: 'Creating — the label swap the press produces (ONL-2244)',
    stories: [
      {
        id: 'tabs-gallery-creating-planning',
        title: 'the press lands',
        note: 'the SOURCE REPO, known before git is consulted',
        render: () => <LiveStrip width={STAGE} initial={[tab('t1', 'acme-storefront')]} />,
      },
      {
        id: 'tabs-gallery-creating-copying',
        title: 'the plan answers',
        note: 'swapped to the drawn workspace name — same box, same width regime',
        render: () => <LiveStrip width={STAGE} initial={[tab('t1', 'crimson-avocet')]} />,
      },
      {
        id: 'tabs-gallery-creating-beside',
        title: 'beside a landed tab',
        note: 'a creating tab is a tab — nothing marks it as provisional',
        render: () => (
          <LiveStrip width={STAGE} initial={[tab('t1', ACTIVE_NAME), tab('t2', 'acme-storefront')]} />
        ),
      },
    ],
  },
  {
    id: 'counts',
    title: 'Counts — the strip hugs its content',
    stories: [
      {
        id: 'tabs-gallery-one',
        title: 'one tab',
        note: 'active fill, ✕ always drawn',
        render: () => <LiveStrip width={STAGE} initial={[tab('t1', ACTIVE_NAME)]} />,
      },
      {
        id: 'tabs-gallery-four',
        title: 'four tabs',
        note: 'no overflow · + hugs tab 4',
        render: () => <LiveStrip width={STAGE} initial={FOUR} />,
      },
      {
        id: 'tabs-gallery-six',
        title: 'six tabs',
        note: 'equal shrink, still above the floor',
        render: () => <LiveStrip width={MASTER} initial={SIX} />,
      },
      {
        id: 'tabs-gallery-many',
        title: 'fourteen tabs',
        note: 'at the floor · row overflows · fade before +',
        render: () => <LiveStrip width={MASTER} initial={MANY} />,
      },
    ],
  },
  {
    id: 'names',
    title: 'Names — the label is what varies, never the box',
    stories: [
      {
        id: 'tabs-gallery-long-name',
        title: 'a long name',
        note: 'tab caps at its max, label truncates',
        render: () => <LiveStrip width={STAGE} initial={LONG} onPreview={() => Promise.resolve({ previewUrl: PREVIEW_IMAGE })} />,
      },
      {
        id: 'tabs-gallery-short-names',
        title: 'short names',
        note: 'tabs do not shrink to their text',
        render: () => <LiveStrip width={STAGE} initial={SHORT} />,
      },
    ],
  },
  {
    id: 'states',
    title: 'States',
    stories: [
      { id: 'tabs-gallery-menu-swap', title: 'a new tab arrives while the menu is open', render: () => <MenuSwapStrip /> },
      {
        id: 'tabs-gallery-shimmer',
        title: 'a background tab working',
        note: 'shimmer at the label’s own type size',
        render: () => <LiveStrip width={STAGE} initial={SHIMMERING} />,
      },
      {
        id: 'tabs-gallery-hover',
        title: 'hovering an inactive tab',
        note: '✕ appears in a slot that was already there',
        render: () => <Forced width={STAGE} tabs={FOUR} hoveredTabId="t3" />,
      },
      {
        id: 'tabs-gallery-rename',
        title: 'renaming',
        note: 'double-click · Enter commits · Escape and blur cancel',
        render: () => <Forced width={STAGE} tabs={FOUR} editingTabId="t1" />,
      },
    ],
  },
  {
    id: 'band',
    title: 'In the band — the strip never fills it',
    stories: [
      {
        id: 'tabs-gallery-in-band',
        title: 'the window bar',
        note: 'many tabs · the + still stops a drag buffer short of the controls',
        render: () => <BandMock update={IDLE_UPDATE_STATE} />,
      },
      {
        id: 'tabs-gallery-in-band-update',
        title: 'an update waiting',
        note: 'the pill ends the left cluster and the strip starts after it',
        render: () => <BandMock update={{ status: 'downloaded', version: '0.4.2' }} />,
      },
    ],
  },
  {
    id: 'parked',
    title: 'The parked surface — what a + tab paints in its first frame',
    stories: [
      {
        id: 'tabs-gallery-parked-defaults',
        title: 'at the shipped rail widths',
        note: 'ONL-2318 · birth facts only — no workspace, no session, no read',
        render: () => (
          <div style={{ width: STAGE, height: 320 }}>
            <ParkedScreen panels={PANEL_DEFAULTS} />
          </div>
        ),
      },
      {
        id: 'tabs-gallery-parked-widened',
        title: 'at widths the user dragged',
        note: 'the rails come back where they were left, so promotion never reflows',
        render: () => (
          <div style={{ width: STAGE, height: 320 }}>
            <ParkedScreen panels={{ ...PANEL_DEFAULTS, sidebar: 340, end: 400 }} />
          </div>
        ),
      },
    ],
  },
];

/** The spacer belongs to the bar, not the strip, and closes to nothing under a full strip (ONL-2206). */
function BandMock({ update }: { update: UpdateState }): React.JSX.Element {
  return (
    <div
      style={{
        width: 1300,
        height: REGION.topBar,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingInline: 8,
        background: 'var(--studio-band)',
      }}
    >
      <div style={{ width: 52, height: 12, flex: '0 0 auto', background: 'var(--color-border)' }} />
      <div style={{ width: 32, height: 32, flex: '0 0 auto', background: 'var(--color-border)' }} />
      <UpdatePillView state={update} onRestart={noop} onRetry={noop} />
      <TabStrip canCreate tabs={MANY} activeTabId="t1" onSelect={noop} onClose={noop} onNew={noop} onRename={noop} testId="tab-strip-band" />
      <div data-testid="band-spacer" style={{ flex: '1 0 0', minWidth: 0, alignSelf: 'stretch' }} />
      <div style={{ width: 32, height: 32, flex: '0 0 auto', background: 'var(--color-border)' }} />
      <div style={{ width: 101, height: 26, flex: '0 0 auto', background: 'var(--color-text-primary)' }} />
    </div>
  );
}

export const TABS_GALLERY: Gallery = {
  id: 'tabs',
  title: 'Tab strip',
  subtitle: 'ONL-2205 — props in, pixels out. No workspace, no session, no port.',
  categories: CATEGORIES,
};
