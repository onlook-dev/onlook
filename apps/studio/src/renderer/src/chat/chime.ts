import { log } from '../log.js';
import { NOTIFICATION_SOUNDS, type NotificationSound, type NotificationSoundPreference } from '@studio/events';

export function notificationAudio(sound: NotificationSound): HTMLAudioElement {
  const file = NOTIFICATION_SOUNDS[sound].file;
  return new Audio(new URL(`../assets/${file}`, import.meta.url).href);
}

export function playChime(preference: NotificationSoundPreference): void {
  if (!preference.enabled) return;
  const audio = notificationAudio(preference.sound);
  void audio.play().catch((err: unknown) => {
    log('chat').warn('the completion chime failed to play', { error: err });
  });
}
