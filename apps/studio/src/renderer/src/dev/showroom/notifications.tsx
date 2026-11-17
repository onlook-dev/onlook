import { useLayoutEffect, useRef } from 'react';
import type { NotificationSoundPreference } from '@studio/events';
import { SoundPickerDialog } from '../../chat/NotificationSoundMenu.js';
import { ChatPanelFrame } from '../../chat/ChatPanelFrame.js';
import { soundPickerFrom, soundPickerReducer, type SoundPickerState } from '../../chat/soundPickerState.js';
import { t } from '@studio/i18n';
import { noop, type Gallery, type Story } from './Showroom.js';

const CHIRP: NotificationSoundPreference = { enabled: true, sound: 'chirp' };
const TWO_TONE: NotificationSoundPreference = { enabled: true, sound: 'two-tone' };
const SILENT: NotificationSoundPreference = { enabled: false, sound: 'two-tone' };

const CLEARED = soundPickerReducer(soundPickerFrom(CHIRP), { type: 'select', sound: 'chirp' });

const STILL_RULES = `
[data-picker-still='hover'] .sound-picker-card[data-sound='two-tone'] { border-color: var(--color-border-emphasized); }
[data-picker-still='hover'] .sound-picker-card[data-sound='two-tone'] .sound-picker-play { color: var(--color-icon-primary); }
[data-picker-still='hover'] .sound-picker-card[data-sound='two-tone'] .sound-picker-bar { opacity: 0.7; }
[data-picker-still='card-focus'] [data-testid='notification-sound-two-tone']::after { outline: 2px solid var(--sound-picker-accent); outline-offset: 2px; }
[data-picker-still='play-focus'] [data-testid='notification-sound-play-chirp'] { outline: 2px solid var(--sound-picker-accent); outline-offset: 2px; }
`;

interface Still {
  id: string;
  title: string;
  state: SoundPickerState;
  playing?: 'chirp' | 'two-tone';
  isSaving?: boolean;
  error?: string;
}

/* Two stills per group: the capture window is one viewport tall and a third scrolls out of frame. */
const GROUPS: { id: string; title: string; stills: Still[] }[] = [
  {
    id: 'picker', title: 'Chosen sound', stills: [
      { id: 'default', title: 'Chirp selected', state: soundPickerFrom(CHIRP) },
      { id: 'two-tone', title: 'Two-tone selected', state: soundPickerFrom(TWO_TONE) },
    ],
  },
  {
    id: 'audition', title: 'Card under the pointer', stills: [
      { id: 'playing', title: 'Auditioning Chirp', state: soundPickerFrom(CHIRP), playing: 'chirp' },
      { id: 'hover', title: 'Two-tone hovered', state: soundPickerFrom(CHIRP) },
    ],
  },
  {
    id: 'quiet', title: 'The two silences', stills: [
      { id: 'cleared', title: 'Cleared, still unmuted', state: CLEARED },
      { id: 'muted', title: 'Muted', state: soundPickerFrom(SILENT) },
    ],
  },
  {
    id: 'commit', title: 'Saving the draft', stills: [
      { id: 'saving', title: 'Saving', state: soundPickerFrom(TWO_TONE), isSaving: true },
      { id: 'save-error', title: 'Save refused', state: soundPickerFrom(TWO_TONE), error: t('chat.sound.saveError') },
    ],
  },
  {
    id: 'focus', title: 'The card’s two tab stops', stills: [
      { id: 'card-focus', title: 'Card focused', state: soundPickerFrom(CHIRP) },
      { id: 'play-focus', title: 'Audition focused', state: soundPickerFrom(CHIRP) },
    ],
  },
];

function PickerStill({ still }: { still: Still }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const target = still.id === 'card-focus' ? 'notification-sound-two-tone'
      : still.id === 'play-focus' ? 'notification-sound-play-chirp' : undefined;
    if (target !== undefined) root.current?.querySelector<HTMLElement>(`[data-testid='${target}']`)?.focus();
  }, [still.id]);
  return (
    <div ref={root} data-picker-still={still.id}>
      <SoundPickerDialog
        isOpen isInline
        state={still.state}
        playing={still.playing ?? null}
        onSelect={noop} onPlay={noop} onToggleMute={noop} onSave={noop} onDismiss={noop}
        {...(still.isSaving === undefined ? {} : { isSaving: still.isSaving })}
        {...(still.error === undefined ? {} : { error: still.error })}
      />
    </div>
  );
}

const BELL_STATES = ['default', 'hover', 'focus'] as const;

const BELL_RULES = `
[data-bell-still='hover'] [data-testid='chat-notifications'] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }
[data-bell-still='focus'] [data-testid='chat-notifications'] { outline: 2px solid var(--color-accent); outline-offset: var(--button-focus-offset); }
`;

const bellStories: Story[] = BELL_STATES.map((state) => ({
  id: `notification-bell-${state}`,
  title: state,
  render: () => (
    <div data-bell-still={state} style={{ width: 340, height: 80 }}>
      <ChatPanelFrame>{null}</ChatPanelFrame>
    </div>
  ),
}));

export const NOTIFICATIONS_GALLERY: Gallery = {
  id: 'notifications',
  title: 'Agent sound',
  categories: [
    { id: 'bell', title: 'Chat header', stories: bellStories },
    ...GROUPS.map((group) => ({
      id: group.id,
      title: group.title,
      stories: group.stills.map((still) => ({
        id: `notification-picker-${still.id}`,
        title: still.title,
        render: () => <PickerStill still={still} />,
      })),
    })),
  ],
  /* A still life cannot hover or focus, so these rules stand in for the states a capture cannot reach. */
  frame: (children) => (
    <div className="notifications-gallery-stills">
      <style href="notifications-gallery-stills" precedence="high">{`${STILL_RULES}${BELL_RULES}`}</style>
      {children}
    </div>
  ),
};
