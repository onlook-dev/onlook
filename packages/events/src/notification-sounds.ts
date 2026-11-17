import { isRecord } from './guards.js';

export const NOTIFICATION_SOUNDS = {
  chirp: { file: 'chirp.wav', labelKey: 'chat.sound.chirp' },
  'two-tone': { file: 'two-tone.wav', labelKey: 'chat.sound.twoTone' },
} as const;

export type NotificationSound = keyof typeof NOTIFICATION_SOUNDS;

export interface NotificationSoundPreference {
  enabled: boolean;
  sound: NotificationSound;
}

export const DEFAULT_NOTIFICATION_SOUND: NotificationSoundPreference = { enabled: true, sound: 'chirp' };

export function isNotificationSoundPreference(value: unknown): value is NotificationSoundPreference {
  return isRecord(value) && typeof value.enabled === 'boolean' &&
    typeof value.sound === 'string' && Object.hasOwn(NOTIFICATION_SOUNDS, value.sound);
}

export function notificationSoundPreference(value: unknown): NotificationSoundPreference {
  return isNotificationSoundPreference(value)
    ? { enabled: value.enabled, sound: value.sound }
    : { ...DEFAULT_NOTIFICATION_SOUND };
}
