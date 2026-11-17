import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ChromeSlots, TabStatus } from '@studio/events';

import { RailRightClosedIcon } from '../icons/glyphs.js';
import { t } from '@studio/i18n';
import { StatusDot, STATUS_DOT_PULSE } from './StatusDot.js';
import { BandIconButton, TopBar } from './TopBar.js';
import { TabStrip } from './tabs/TabStrip.js';

const noop = (): void => {};

/** The style block's reduced-motion rule carries `data-status` too, so a whole-markup match would answer for the stylesheet. */
function dot(markup: string, testId: string): string {
  const at = markup.indexOf(`data-testid="${testId}"`);
  expect(at, testId).toBeGreaterThan(-1);
  const open = markup.lastIndexOf('<span', at);
  return markup.slice(open, markup.indexOf('>', at) + 1);
}

function bare(status?: TabStatus): string {
  return renderToStaticMarkup(
    <StatusDot testId="probe" {...(status === undefined ? {} : { status })} />,
  );
}

describe('the shared status dot (ONL-2455)', () => {
  it('draws the working ink achromatic and pulsing', () => {
    const inked = dot(bare('working'), 'probe');
    expect(inked).toContain('data-status="working"');
    expect(inked).toContain('background:var(--color-text-secondary)');
    expect(inked).toContain(STATUS_DOT_PULSE);
  });

  it('draws the attention ink steady', () => {
    const inked = dot(bare('waiting'), 'probe');
    expect(inked).toContain('data-status="waiting"');
    expect(inked).toContain('background:var(--color-icon-orange)');
    expect(inked).not.toContain(STATUS_DOT_PULSE);
  });

  it('keeps the tab strip\'s finished-turn ink, steady', () => {
    const inked = dot(bare('done'), 'probe');
    expect(inked).toContain('data-status="done"');
    expect(inked).toContain('background:var(--color-icon-teal)');
    expect(inked).not.toContain(STATUS_DOT_PULSE);
  });

  it('draws and names nothing when no status is supplied', () => {
    const empty = dot(bare(), 'probe');
    expect(empty).not.toContain('data-status=');
    expect(empty).not.toContain('aria-label');
    expect(empty).not.toContain('role="img"');
    expect(empty).toContain('background:transparent');
  });

  it('names its state, from the catalog', () => {
    expect(dot(bare('working'), 'probe')).toContain(`aria-label="${t('tabs.status.working')}"`);
    expect(dot(bare('waiting'), 'probe')).toContain(`aria-label="${t('tabs.status.waiting')}"`);
  });

  it('lets a surface outside the tab vocabulary name the dot itself (ONL-2499)', () => {
    const named = renderToStaticMarkup(<StatusDot testId="probe" status="done" label={t('projectSetup.state.running')} />);
    expect(dot(named, 'probe')).toContain(`aria-label="${t('projectSetup.state.running')}"`);
    expect(dot(named, 'probe')).not.toContain(t('tabs.status.done'));
  });

  it('carries its own pulse clock and the reduced-motion escape', () => {
    const markup = bare('working');
    expect(markup).toContain(`@keyframes ${STATUS_DOT_PULSE}`);
    expect(markup).toContain('prefers-reduced-motion: reduce');
    expect(markup).toMatch(/\[data-status='working'\]\s*\{\s*animation: none/u);
  });
});

function band(icon: {
  status?: TabStatus;
}): string {
  return renderToStaticMarkup(
    <BandIconButton
      icon={RailRightClosedIcon}
      label={t('topbar.rail.right.show')}
      testId="probe-button"
      onPress={noop}
      {...(icon.status === undefined ? {} : { status: icon.status })}
    />,
  );
}

describe('the band control\'s one child slot (ONL-2455)', () => {
  it('draws the dot beside its glyph', () => {
    const markup = band({ status: 'working' });
    expect(dot(markup, 'probe-button-status')).toContain('data-status="working"');
  });
});

const RAILS = (rightStatus?: TabStatus): ChromeSlots => ({
  showFolder: true,
  rails: { left: false, right: true, ...(rightStatus === undefined ? {} : { rightStatus }) },
});

function bar(slots: ChromeSlots): string {
  return renderToStaticMarkup(
    <TopBar
      tabs={[{ id: 't1', name: 'Home' }]}
      activeTabId="t1"
      onSelectTab={noop}
      onCloseTab={noop}
      onNewTab={noop}
      onRenameTab={noop}
      onReloadTab={noop}
      canCreate
      isHome={false}
      slots={slots}
      onFolder={noop}
      onToggleRail={noop}
      onGitAction={noop}
      onGitPick={noop}
    />,
  );
}

describe('the dot on the chat-panel toggle (ONL-2455)', () => {
  it('pulses while a turn runs behind the closed panel', () => {
    const inked = dot(bar(RAILS('working')), 'topbar-rail-right-status');
    expect(inked).toContain('data-status="working"');
    expect(inked).toContain(STATUS_DOT_PULSE);
  });

  it('holds steady on a request the session is keeping', () => {
    const inked = dot(bar(RAILS('waiting')), 'topbar-rail-right-status');
    expect(inked).toContain('data-status="waiting"');
    expect(inked).not.toContain(STATUS_DOT_PULSE);
  });

  it('clears when the turn ends, whichever way it ended', () => {
    const markup = bar(RAILS());
    expect(markup).toContain('data-testid="topbar-rail-right"');
    expect(markup).not.toContain('topbar-rail-right-status');
  });

  it('leaves the band\'s other controls undotted', () => {
    const markup = bar(RAILS('working'));
    expect(markup).not.toContain('topbar-rail-left-status');
    expect(markup).not.toContain('topbar-folder-status');
  });
});

function strip(status: TabStatus, activeTabId: string): string {
  return renderToStaticMarkup(
    <TabStrip
      canCreate
      tabs={[{ id: 't1', name: 'Home', status }]}
      activeTabId={activeTabId}
      onSelect={noop}
      onClose={noop}
      onNew={noop}
      onRename={noop}
      onReload={noop}
    />,
  );
}

describe('the tab strip\'s own dot, unchanged by the lift (ONL-2455)', () => {
  it('draws done and waiting, and leaves working to the close-slot spinner (ONL-2593)', () => {
    expect(dot(strip('working', 'tX'), 'tab-status')).not.toContain('data-status=');
    expect(dot(strip('done', 'tX'), 'tab-status')).toContain('background:var(--color-icon-teal)');
    expect(dot(strip('waiting', 'tX'), 'tab-status')).toContain('background:var(--color-icon-orange)');
  });

  it('still drops the finished-turn dot on the tab being looked at, and keeps waiting', () => {
    expect(dot(strip('done', 't1'), 'tab-status')).not.toContain('data-status=');
    expect(dot(strip('working', 't1'), 'tab-status')).not.toContain('data-status=');
    expect(dot(strip('waiting', 't1'), 'tab-status')).toContain('data-status="waiting"');
  });
});
