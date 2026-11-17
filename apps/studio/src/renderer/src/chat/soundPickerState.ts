import type { NotificationSound, NotificationSoundPreference } from '@studio/events';

export interface SoundPickerState {
  selected: NotificationSound | null;
  isMuted: boolean;
  /** Never the catalog default: this always carries a real choice, so unmuting returns the one the user last picked. */
  remembered: NotificationSound;
}

export type SoundPickerAction = { type: 'select'; sound: NotificationSound } | { type: 'toggleMute' };

export function soundPickerFrom(preference: NotificationSoundPreference): SoundPickerState {
  return {
    selected: preference.enabled ? preference.sound : null,
    isMuted: !preference.enabled,
    remembered: preference.sound,
  };
}

export function soundPickerReducer(state: SoundPickerState, action: SoundPickerAction): SoundPickerState {
  switch (action.type) {
    case 'select':
      return state.selected === action.sound
        ? { ...state, selected: null }
        : { selected: action.sound, isMuted: false, remembered: action.sound };
    case 'toggleMute':
      return state.isMuted
        ? { ...state, isMuted: false, selected: state.remembered }
        : { ...state, isMuted: true, selected: null };
  }
}

/** Only the audition control toggles an audition off; choosing a card always restarts its sound, as the ported design does. */
export function nextAudition(
  playing: NotificationSound | null,
  sound: NotificationSound,
  intent: 'toggle' | 'restart',
): NotificationSound | null {
  return intent === 'toggle' && playing === sound ? null : sound;
}

/** Clearing the last card and muting are different drafts that commit the same stored silence. */
export function soundPickerPreference(state: SoundPickerState): NotificationSoundPreference {
  return state.selected === null
    ? { enabled: false, sound: state.remembered }
    : { enabled: true, sound: state.selected };
}
