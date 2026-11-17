import { describe, expect, it } from 'bun:test';
import type { NotificationSoundPreference } from '@studio/events';
import {
  nextAudition,
  soundPickerFrom,
  soundPickerPreference,
  soundPickerReducer,
  type SoundPickerAction,
  type SoundPickerState,
} from './soundPickerState.js';

function run(preference: NotificationSoundPreference, ...actions: SoundPickerAction[]): SoundPickerState {
  return actions.reduce(soundPickerReducer, soundPickerFrom(preference));
}

const select = (sound: 'chirp' | 'two-tone'): SoundPickerAction => ({ type: 'select', sound });
const mute: SoundPickerAction = { type: 'toggleMute' };

describe('the sound picker draft', () => {
  it('seeds a saved sound as the selected card', () => {
    expect(soundPickerFrom({ enabled: true, sound: 'chirp' })).toEqual({
      selected: 'chirp', isMuted: false, remembered: 'chirp',
    });
  });

  it('seeds a saved silence as muted, remembering the sound it would return to', () => {
    expect(soundPickerFrom({ enabled: false, sound: 'two-tone' })).toEqual({
      selected: null, isMuted: true, remembered: 'two-tone',
    });
  });

  it('returns the pre-mute sound on unmute', () => {
    const state = run({ enabled: true, sound: 'two-tone' }, mute);
    expect(state.selected).toBeNull();
    expect(soundPickerReducer(state, mute).selected).toBe('two-tone');
  });

  it('still returns the cleared sound on unmute, and commits it as the sound a restart restores', () => {
    const cleared = run({ enabled: true, sound: 'two-tone' }, select('two-tone'), mute);
    expect(soundPickerReducer(cleared, mute).selected).toBe('two-tone');
    expect(soundPickerPreference(cleared)).toEqual({ enabled: false, sound: 'two-tone' });
  });

  it('clears the selection when its own card is pressed, without muting the draft', () => {
    expect(run({ enabled: true, sound: 'chirp' }, select('chirp'))).toEqual({
      selected: null, isMuted: false, remembered: 'chirp',
    });
  });

  it('commits a cleared selection as the silence a reopen shows as muted', () => {
    const committed = soundPickerPreference(run({ enabled: true, sound: 'two-tone' }, select('two-tone')));
    expect(committed).toEqual({ enabled: false, sound: 'two-tone' });
    expect(soundPickerFrom(committed).isMuted).toBe(true);
  });

  it('commits the chosen sound', () => {
    expect(soundPickerPreference(run({ enabled: false, sound: 'chirp' }, select('two-tone')))).toEqual({
      enabled: true, sound: 'two-tone',
    });
  });
});

describe('the audition', () => {
  it('restarts the sound of a card that is picked while it is already auditioning', () => {
    expect(nextAudition('two-tone', 'two-tone', 'restart')).toBe('two-tone');
  });

  it('stops only when its own control is pressed a second time', () => {
    expect(nextAudition('two-tone', 'two-tone', 'toggle')).toBeNull();
    expect(nextAudition('chirp', 'two-tone', 'toggle')).toBe('two-tone');
    expect(nextAudition(null, 'two-tone', 'toggle')).toBe('two-tone');
  });
});
