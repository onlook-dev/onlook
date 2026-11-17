import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { NOTIFICATION_SOUNDS, type NotificationSound } from '@studio/events';
import { SoundPickerDialog, type SoundPickerDialogProps } from './NotificationSoundMenu.js';
import { NOTIFICATION_SOUND_RULES } from './notificationSoundStyles.js';
import { soundPickerFrom } from './soundPickerState.js';
import { waveformFor } from './soundWaveforms.js';
import { t } from '@studio/i18n';

const noop = (): void => undefined;

function render(overrides: Partial<SoundPickerDialogProps> = {}): string {
  return renderToStaticMarkup(
    <SoundPickerDialog
      isOpen isInline
      state={soundPickerFrom({ enabled: true, sound: 'chirp' })}
      playing={null}
      onSelect={noop} onPlay={noop} onToggleMute={noop} onSave={noop} onDismiss={noop}
      {...overrides}
    />,
  );
}

/** The rules module rides in the markup, so a whole-markup match would answer for the stylesheet. */
function slice(markup: string, testid: string): string {
  const at = markup.indexOf(`data-testid="${testid}"`);
  expect(at).toBeGreaterThan(-1);
  // From the opening tag, not the testid: an attribute the library emits earlier would be invisible.
  return markup.slice(markup.lastIndexOf('<button', at), markup.indexOf('</button>', at));
}

describe('the sound picker', () => {
  it('offers exactly the shipped catalog, and no paused sound', () => {
    const markup = render();
    expect(Object.keys(NOTIFICATION_SOUNDS)).toEqual(['chirp', 'two-tone']);
    for (const sound of Object.keys(NOTIFICATION_SOUNDS) as NotificationSound[]) {
      expect(markup).toContain(`data-testid="notification-sound-${sound}"`);
    }
    expect(markup).not.toContain('Paused');
  });

  it('marks the saved sound as the pressed card and leaves the other unpressed', () => {
    const markup = render({ state: soundPickerFrom({ enabled: true, sound: 'two-tone' }) });
    expect(slice(markup, 'notification-sound-two-tone')).toContain('aria-pressed="true"');
    expect(slice(markup, 'notification-sound-chirp')).toContain('aria-pressed="false"');
  });

  it('dims the grid and takes every card out of reach while muted', () => {
    const markup = render({ state: soundPickerFrom({ enabled: false, sound: 'two-tone' }) });
    expect(markup).toContain('data-muted="true"');
    expect(slice(markup, 'notification-sound-chirp')).toContain('disabled');
    expect(slice(markup, 'notification-sound-play-chirp')).toContain('disabled');
    expect(slice(markup, 'notification-sound-mute')).toContain(t('chat.sound.unmute'));
  });

  it('draws each sound its own waveform', () => {
    expect(waveformFor('chirp')).not.toEqual(waveformFor('two-tone'));
    const markup = render();
    for (const height of [waveformFor('chirp')[9], waveformFor('two-tone')[5]]) {
      expect(markup).toContain(`height:${String(height)}px`);
    }
  });

  it('names the audition control by its sound and its action', () => {
    const idle = slice(render(), 'notification-sound-play-chirp');
    expect(idle).toContain(t('chat.sound.play', { sound: t('chat.sound.chirp') }));
    const busy = slice(render({ playing: 'chirp' }), 'notification-sound-play-chirp');
    expect(busy).toContain(t('chat.sound.pause', { sound: t('chat.sound.chirp') }));
  });

  it('keeps the audition beside the card choice rather than inside it', () => {
    const markup = render();
    expect(slice(markup, 'notification-sound-chirp')).not.toContain('notification-sound-play-chirp');
    expect(slice(markup, 'notification-sound-play-chirp')).not.toContain('notification-sound-chirp"');
  });

  it('keeps the draft visible when a save is refused', () => {
    const markup = render({ state: soundPickerFrom({ enabled: true, sound: 'two-tone' }), error: t('chat.sound.saveError') });
    expect(markup).toContain('role="alert"');
    expect(markup).toContain(t('chat.sound.saveError'));
    expect(slice(markup, 'notification-sound-two-tone')).toContain('aria-pressed="true"');
  });

  it('freezes the whole draft while the choice is being written', () => {
    const markup = render({ isSaving: true });
    expect(markup).toContain('aria-busy="true"');
    const frozen = ['notification-sound-later', 'notification-sound-mute', 'notification-sound-chirp', 'notification-sound-play-chirp'];
    for (const control of frozen) {
      expect(slice(markup, control)).toContain('disabled');
    }
  });

  it('gives the card the focus ring the ported design suppresses', () => {
    expect(NOTIFICATION_SOUND_RULES).toContain('.sound-picker :is(button):focus-visible');
    expect(NOTIFICATION_SOUND_RULES).toContain('.sound-picker-select:focus-visible::after { outline:');
  });

  it('keeps the selected card still', () => {
    expect(NOTIFICATION_SOUND_RULES).not.toContain('@keyframes');
    expect(NOTIFICATION_SOUND_RULES).not.toContain('animation');
    expect(NOTIFICATION_SOUND_RULES).not.toContain('blur(');
  });
});
