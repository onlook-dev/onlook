import { useEffect, useRef } from 'react';
import { APP_COMMAND_ORDER, IDLE_UPDATE_STATE, type ChromeSlots, type UpdateState, type WindowControlsEdge } from '@studio/events';
import { TopBarView } from '../../chrome/TopBar.js';
import { UpdatePillView } from '../../chrome/UpdatePill.js';
import { Presence } from '../../chrome/Presence.js';
import { AppMenuView } from '../../chrome/AppMenu.js';
import { appMenuSections } from '../../chrome/appMenuSections.js';
import { helpMenuItems } from '../../rail/helpMenu.js';
import { pillKey } from '@studio/i18n/update';
import { noop, type Gallery } from './Showroom.js';

const ONBOARDING_SLOTS: ChromeSlots = { blendsIntoScreen: true };

/** The ground below the band, so the seam between them is what the still shows. */
const SCREEN_BELOW = 96;

function Band({ slots, isHome, update = IDLE_UPDATE_STATE, interaction, isWindowFocused = true, updateInteraction = false, windowControls = 'leading' }: {
  slots: ChromeSlots;
  isHome: boolean;
  update?: UpdateState;
  interaction?: 'hover' | 'focus';
  isWindowFocused?: boolean;
  updateInteraction?: boolean;
  windowControls?: WindowControlsEdge;
}): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const button = host.current?.querySelector<HTMLButtonElement>(updateInteraction ? '[data-testid="topbar-update"]' : '[data-testid="topbar-folder"]');
    if (interaction === 'focus') button?.focus();
    if (interaction === 'hover') button?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }, [interaction, updateInteraction]);
  return <div ref={host} style={{ width: 700 }}>
    <TopBarView
      update={<Presence isShown={pillKey(update) !== null} gap={12}><UpdatePillView state={update} onRestart={noop} isRestarting={update.restarting} /></Presence>}
      appMenu={<AppMenuView sections={appMenuSections(APP_COMMAND_ORDER, helpMenuItems(), slots.rails !== undefined)} onCommand={noop} onHelp={noop} />}
      tabs={isHome ? [] : [{ id: 'project', name: 'Website' }]}
      activeTabId={isHome ? 'home' : 'project'}
      canCreate={!isHome}
      isHome={isHome}
      isWindowFocused={isWindowFocused}
      windowControls={windowControls}
      slots={slots}
      onSelectTab={noop}
      onCloseTab={noop}
      onNewTab={noop}
      onRenameTab={noop}
      onReloadTab={noop}
      onFolder={noop}
      onToggleRail={noop}
      onGitAction={noop}
      onGitPick={noop}
    />
    <div style={{ height: SCREEN_BELOW, background: 'var(--studio-ground)' }} />
  </div>;
}

export const TOPBAR_GALLERY: Gallery = {
  id: 'topbar',
  title: 'Onboarding window bar',
  subtitle: 'Select one state to inspect the real window-bar component over the screen below it.',
  categories: [
    {
      id: 'authorization-denied', title: 'Update · administrator access',
      stories: [{ id: 'topbar-gallery-authorization-denied', title: 'Updates paused', render: () => <Band slots={ONBOARDING_SLOTS} isHome update={{ status: 'error', message: 'UPDATE_AUTHORIZATION_DENIED' }} /> }],
    },
    {
      id: 'disk-full', title: 'Update · disk full',
      stories: [{ id: 'topbar-gallery-disk-full', title: 'Free space before updating', render: () => <Band slots={ONBOARDING_SLOTS} isHome update={{ status: 'error', message: 'No space left on device' }} /> }],
    },
    {
      id: 'windows', title: 'Windows · caption buttons over the band',
      stories: [
        { id: 'windows-editor', title: 'Canvas', render: () => <Band slots={{ showFolder: true, rails: { left: false, right: false } }} isHome={false} windowControls="trailing" /> },
        { id: 'windows-hover', title: 'Projects hover', render: () => <Band slots={{ showFolder: true }} isHome={false} windowControls="trailing" interaction="hover" /> },
        { id: 'windows-focus', title: 'Projects focus', render: () => <Band slots={{ showFolder: true }} isHome={false} windowControls="trailing" interaction="focus" /> },
        { id: 'windows-unfocused', title: 'Window unfocused', render: () => <Band slots={{ showFolder: true }} isHome={false} windowControls="trailing" isWindowFocused={false} /> },
        { id: 'windows-selected', title: 'Projects selected', render: () => <Band slots={{ showFolder: true }} isHome windowControls="trailing" /> },
        { id: 'windows-disabled', title: 'Switching Project', render: () => <Band slots={{ showFolder: false }} isHome={false} windowControls="trailing" /> },
        { id: 'windows-error', title: 'Update error', render: () => <Band slots={ONBOARDING_SLOTS} isHome windowControls="trailing" update={{ status: 'error' }} /> },
        { id: 'windows-empty', title: 'Onboarding', render: () => <Band slots={ONBOARDING_SLOTS} isHome windowControls="trailing" /> },
      ],
    },
    {
      id: 'restarting', title: 'Restart to update · restarting',
      stories: [{ id: 'topbar-gallery-restarting', title: 'Contrasting spinner on the update pill', render: () => <Band slots={ONBOARDING_SLOTS} isHome update={{ status: 'downloaded', restarting: true }} /> }],
    },
    ...(['hover', 'focus'] as const).map((interaction) => ({
      id: `update-${interaction}`, title: `Restart to update · ${interaction}`,
      stories: [{ id: `topbar-gallery-update-${interaction}`, title: 'Restart control', render: () => <Band slots={ONBOARDING_SLOTS} isHome update={{ status: 'downloaded' }} interaction={interaction} updateInteraction /> }],
    })),
    ...([
      { id: 'idle', update: { status: 'idle' } },
      { id: 'background-checking', update: { status: 'checking' } },
      { id: 'background-up-to-date', update: { status: 'up-to-date' } },
      { id: 'checking', update: { status: 'checking', requested: true } },
      { id: 'up-to-date', update: { status: 'up-to-date', requested: true } },
      { id: 'available', update: { status: 'available' } },
      { id: 'downloading', update: { status: 'downloading' } },
      { id: 'downloaded', update: { status: 'downloaded' } },
      { id: 'error', update: { status: 'error' } },
    ] satisfies Array<{ id: string; update: UpdateState }>).map(({ id, update }) => ({
      id,
      title: `Onboarding · ${id}`,
      stories: [{
        id: `topbar-gallery-${id}`,
        title: 'No project controls, band joins the page',
        render: () => <Band slots={ONBOARDING_SLOTS} isHome update={{ ...update, version: '0.4.2', percent: 42 }} />,
      }],
    })),
    {
      id: 'unfocused', title: 'Onboarding · window blurred',
      stories: [{ id: 'topbar-gallery-unfocused', title: 'Stand-in traffic lights over the page ground', render: () => <Band slots={ONBOARDING_SLOTS} isHome isWindowFocused={false} /> }],
    },
    {
      id: 'projects', title: 'Projects Screen',
      stories: [{ id: 'topbar-gallery-projects', title: 'Selected Projects control', render: () => <Band slots={{ showFolder: true }} isHome /> }],
    },
    {
      id: 'editor', title: 'Canvas Screen',
      stories: [{ id: 'topbar-gallery-editor', title: 'Projects and rail controls', render: () => <Band slots={{ showFolder: true, rails: { left: false, right: false } }} isHome={false} /> }],
    },
    {
      id: 'switching', title: 'Switching Project',
      stories: [{ id: 'topbar-gallery-switching', title: 'Projects control stays inert', render: () => <Band slots={{ showFolder: false, rails: { left: false, right: false } }} isHome={false} /> }],
    },
    ...(['hover', 'focus'] as const).map((interaction) => ({
      id: interaction, title: `Editor · ${interaction}`,
      stories: [{ id: `topbar-gallery-${interaction}`, title: 'Projects control', render: () => <Band slots={{ showFolder: true, rails: { left: false, right: false } }} isHome={false} interaction={interaction} /> }],
    })),
  ],
};
