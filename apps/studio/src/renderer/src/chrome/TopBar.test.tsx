import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ChromeSlots, UpdateState, WindowControlsEdge } from '@studio/events';
import { TopBarView } from './TopBar.js';
import { UpdatePillView } from './UpdatePill.js';
import { AppMenuView } from './AppMenu.js';
import { appMenuSections } from './appMenuSections.js';

const noop = (): void => {};

const APP_MENU = <AppMenuView sections={appMenuSections(['new-tab', 'quit'], [], true)} onCommand={noop} onHelp={noop} />;

function bar(slots: ChromeSlots, isHome = true, update?: UpdateState, windowControls: WindowControlsEdge = 'leading'): string {
  return renderToStaticMarkup(
    <TopBarView
      update={update ? <UpdatePillView state={update} onRestart={noop} onRetry={noop} /> : null}
      appMenu={APP_MENU}
      tabs={[]}
      activeTabId="home"
      canCreate={false}
      isHome={isHome}
      slots={slots}
      windowControls={windowControls}
      isWindowFocused={false}
      onSelectTab={noop}
      onCloseTab={noop}
      onNewTab={noop}
      onRenameTab={noop}
      onReloadTab={noop}
      onFolder={noop}
      onToggleRail={noop}
      onGitAction={noop}
      onGitPick={noop}
    />,
  );
}

const ONBOARDING: ChromeSlots = { blendsIntoScreen: true };

it('removes the entire tab strip for account access but keeps it for signed-in onboarding', () => {
  expect(bar({ blendsIntoScreen: true, tabsHidden: true })).not.toContain('data-testid="tab-strip"');
  expect(bar(ONBOARDING)).toContain('data-testid="tab-strip"');
});

it('Windows omits the traffic-light reserve and inactive Mac lights', () => {
  expect(bar(ONBOARDING)).toContain('width:64px');
  expect(bar(ONBOARDING, true, undefined, 'trailing')).not.toContain('width:64px');
});

describe('the app menu (ONL-3127)', () => {
  it('Windows ends the band with the menu button, grouped with the caption buttons the system draws', () => {
    for (const slots of [ONBOARDING, { showFolder: true }, { showFolder: true, rails: { left: false, right: false } }] satisfies ChromeSlots[]) {
      const markup = bar(slots, true, undefined, 'trailing');
      const end = markup.indexOf('data-testid="topbar-window-end"');
      expect(end).toBeGreaterThan(-1);
      expect(markup.indexOf('data-testid="app-menu-button"')).toBeGreaterThan(end);
    }
  });

  it('macOS draws no menu button: its commands live in the OS menu bar', () => {
    const markup = bar({ showFolder: true, rails: { left: false, right: false } }, false);
    expect(markup).not.toContain('data-testid="topbar-window-end"');
    expect(markup).not.toContain('data-testid="app-menu-button"');
  });

  it('the menu button names itself and says it opens a menu', () => {
    const markup = bar(ONBOARDING, true, undefined, 'trailing');
    const button = markup.match(/<button[^>]*data-testid="app-menu-button"[^>]*>/)?.[0];
    expect(button).toContain('aria-haspopup="menu"');
    expect(button).toContain('aria-expanded="false"');
    expect(button).toMatch(/aria-label="[^"]+"/);
  });
});

it('draws a contrasting restart spinner, not another clickable button', () => {
  const markup = renderToStaticMarkup(<UpdatePillView state={{ status: 'downloaded' }} onRestart={noop} onRetry={noop} isRestarting />);
  const spinner = markup.match(/<span[^>]*data-testid="update-restart-spinner"[^>]*>/)?.[0];
  expect(spinner).toContain('color:var(--studio-update-ink)');
  expect(markup).toContain('aria-busy="true"');
  expect(markup).not.toContain('<button');
  expect(markup).toContain('data-testid="update-restart-spinner"');
});

it('makes authorization guidance a retry button without making ordinary errors clickable', () => {
  const refused = bar(ONBOARDING, true, { status: 'error', message: 'UPDATE_AUTHORIZATION_DENIED' });
  expect(refused).toMatch(/<button[^>]*data-testid="topbar-update"/);
  expect(refused).toContain('Update needs administrator access. Click to retry.');
  const ordinary = bar(ONBOARDING, true, { status: 'error', message: 'download interrupted' });
  expect(ordinary).not.toMatch(/<button[^>]*data-testid="topbar-update"/);
});

describe('Projects control visibility (ONL-2625)', () => {
  it('draws no project controls before a screen supplies them', () => {
    const markup = bar(ONBOARDING);
    expect(markup).not.toContain('data-testid="topbar-folder"');
    expect(markup).not.toContain('data-testid="topbar-rail-left"');
    expect(markup).not.toContain('data-testid="topbar-rail-right"');
    expect(markup).toContain('data-testid="topbar"');
  });

  it('draws the selected control on the Projects Screen even without open projects', () => {
    const markup = bar({ showFolder: true });
    expect(markup).toContain('data-testid="topbar-folder"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-disabled="true"');
  });

  it('draws an actionable control in the editor', () => {
    const markup = bar({ showFolder: true, rails: { left: false, right: false } }, false);
    expect(markup).toContain('data-testid="topbar-folder"');
    expect(markup).not.toContain('aria-pressed="true"');
    expect(markup).not.toContain('aria-disabled="true"');
  });

  it('restores both rail controls with the editor slots', () => {
    const markup = bar({ showFolder: true, rails: { left: false, right: false } }, false);
    expect(markup).toContain('data-testid="topbar-rail-left"');
    expect(markup).toContain('data-testid="topbar-rail-right"');
  });

  it('keeps the control present but inert while the editor switches projects', () => {
    const markup = bar({ showFolder: false }, false);
    expect(markup).toContain('data-testid="topbar-folder"');
    expect(markup).toContain('aria-disabled="true"');
  });

  it.each(['available', 'downloading', 'downloaded'] as const)('keeps a %s update visible during onboarding', (status) => {
    const markup = bar(ONBOARDING, true, { status, version: '0.4.2', percent: 42 });
    expect(markup).not.toContain('data-testid="topbar-folder"');
    expect(markup).toContain('data-testid="topbar-update"');
    expect(markup).toContain(`data-update-status="${status}"`);
  });
});

describe('Band fill (ONL-2625)', () => {
  it('takes the onboarding screen ground and drops the divider', () => {
    const markup = bar(ONBOARDING);
    expect(markup).toContain('background:var(--studio-ground)');
    expect(markup).not.toContain('background:var(--studio-band)');
    expect(markup).not.toContain('data-testid="topbar-divider"');
  });

  it('stays a drag region while blended', () => {
    expect(bar(ONBOARDING)).toMatch(/class="[^"]*region-drag[^"]*"[^>]*data-testid="topbar"/);
  });

  it.each([{}, { showFolder: true }, { showFolder: true, rails: { left: false, right: false } }] as ChromeSlots[])(
    'keeps the band fill and divider outside onboarding',
    (slots) => {
      const markup = bar(slots, false);
      expect(markup).toContain('background:var(--studio-band)');
      expect(markup).not.toContain('background:var(--studio-ground)');
      expect(markup).toContain('data-testid="topbar-divider"');
    },
  );
});
