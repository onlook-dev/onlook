import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '../overlay/Dialog.js';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack } from '@astryxdesign/core/Layout';
import { NOTIFICATION_SOUNDS, type NotificationSound } from '@studio/events';
import { t } from '@studio/i18n';
import { BellIcon, PauseIcon, PlayGlyph, VolumeOffIcon, VolumeOnIcon } from '../icons/glyphs.js';
import { log } from '../log.js';
import { useSettingsStore } from '../settings/store.js';
import { notificationAudio } from './chime.js';
import { NOTIFICATION_SOUND_HREF, NOTIFICATION_SOUND_RULES } from './notificationSoundStyles.js';
import { nextAudition, soundPickerFrom, soundPickerPreference, soundPickerReducer, type SoundPickerState } from './soundPickerState.js';
import { waveformFor } from './soundWaveforms.js';

const SOUNDS = Object.keys(NOTIFICATION_SOUNDS) as NotificationSound[];
/** Both labels measured at the footer's size, so the swap never reflows the row. */
const MUTE_WIDTH = { minWidth: 92 } as const;

export interface SoundPickerDialogProps {
  isOpen: boolean;
  state: SoundPickerState;
  playing: NotificationSound | null;
  onSelect: (sound: NotificationSound) => void;
  onPlay: (sound: NotificationSound) => void;
  onToggleMute: () => void;
  onSave: () => void;
  onDismiss: () => void;
  isSaving?: boolean;
  error?: string;
  isInline?: boolean;
}

function SoundCard({
  sound, state, playing, onSelect, onPlay, isFrozen,
}: Pick<SoundPickerDialogProps, 'state' | 'playing' | 'onSelect' | 'onPlay'> & { sound: NotificationSound; isFrozen: boolean }): React.JSX.Element {
  const isSelected = state.selected === sound;
  const isPlaying = playing === sound;
  const name = t(NOTIFICATION_SOUNDS[sound].labelKey);
  // Two sibling controls, never nested: the select button's stretched ::after is the card-wide target, and the audition sits above it.
  return (
    <div className="sound-picker-card" data-sound={sound} data-selected={isSelected}>
      <button
        type="button"
        className="sound-picker-play"
        aria-label={t(isPlaying ? 'chat.sound.pause' : 'chat.sound.play', { sound: name })}
        data-testid={`notification-sound-play-${sound}`}
        disabled={state.isMuted || isFrozen}
        onClick={() => onPlay(sound)}
      >
        <Icon icon={isPlaying ? PauseIcon : PlayGlyph} style={{ width: 16, height: 16 }} />
      </button>
      <button
        type="button"
        className="sound-picker-select"
        aria-pressed={isSelected}
        data-testid={`notification-sound-${sound}`}
        disabled={state.isMuted || isFrozen}
        onClick={() => onSelect(sound)}
      >
        <span className="sound-picker-name">{name}</span>
        <span className="sound-picker-wave" aria-hidden="true">
          {waveformFor(sound).map((height, slot) => (
            <span key={slot} className="sound-picker-bar" style={{ height }} />
          ))}
        </span>
      </button>
    </div>
  );
}

export function SoundPickerDialog({
  isOpen, state, playing, onSelect, onPlay, onToggleMute, onSave, onDismiss, isSaving = false, error, isInline,
}: SoundPickerDialogProps): React.JSX.Element {
  const id = useId();
  return (
    <Dialog
      isOpen={isOpen}
      {...(isInline === undefined ? {} : { isInline })}
      onOpenChange={(open) => { if (!open && !isSaving) onDismiss(); }}
      width={340}
      padding={6}
      purpose="form"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      data-testid="notification-sound-dialog"
    >
      <style href={NOTIFICATION_SOUND_HREF} precedence="medium">{NOTIFICATION_SOUND_RULES}</style>
      <div className="sound-picker" aria-busy={isSaving}>
        <header className="sound-picker-head">
          <h2 id={`${id}-title`}>{t('chat.sound.title')}</h2>
          <p id={`${id}-description`}>{t('chat.sound.description')}</p>
        </header>
        {/* The draft is frozen while the write is in flight, so a save can never commit one choice and leave a later one on screen. */}
        <div className="sound-picker-grid" data-muted={state.isMuted}>
          {SOUNDS.map((sound) => (
            <SoundCard key={sound} sound={sound} state={state} playing={playing} onSelect={onSelect} onPlay={onPlay} isFrozen={isSaving} />
          ))}
        </div>
        {error === undefined ? null : <p className="sound-picker-error" role="alert">{error}</p>}
        <HStack justify="between" vAlign="center">
          <Button
            label={t(state.isMuted ? 'chat.sound.unmute' : 'chat.sound.mute')}
            icon={<Icon icon={state.isMuted ? VolumeOnIcon : VolumeOffIcon} />}
            variant={state.isMuted ? 'secondary' : 'ghost'}
            size="sm"
            isDisabled={isSaving}
            style={MUTE_WIDTH}
            data-testid="notification-sound-mute"
            onClick={onToggleMute}
          />
          <HStack gap={2}>
            <Button
              label={t('chat.sound.later')}
              variant="secondary"
              size="sm"
              isDisabled={isSaving}
              data-testid="notification-sound-later"
              onClick={onDismiss}
            />
            <Button
              label={t('chat.sound.save')}
              variant="primary"
              size="sm"
              isLoading={isSaving}
              data-testid="notification-sound-save"
              onClick={onSave}
            />
          </HStack>
        </HStack>
      </div>
    </Dialog>
  );
}

export function NotificationSoundMenu(): React.JSX.Element {
  const preference = useSettingsStore((store) => store.notificationSound);
  const setPreference = useSettingsStore((store) => store.setNotificationSound);
  const [isOpen, setOpen] = useState(false);
  const [draft, setDraft] = useState<SoundPickerState>(() => soundPickerFrom(preference));
  const [playing, setPlaying] = useState<NotificationSound | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const audio = useRef(new Map<NotificationSound, HTMLAudioElement>());

  const stopAll = (): void => {
    for (const element of audio.current.values()) {
      element.pause();
      element.currentTime = 0;
    }
    setPlaying(null);
  };
  const held = audio.current;
  useEffect(() => () => {
    for (const element of held.values()) {
      element.onended = null;
      element.pause();
    }
  }, [held]);

  const elementFor = (sound: NotificationSound): HTMLAudioElement => {
    const already = audio.current.get(sound);
    if (already !== undefined) return already;
    const made = notificationAudio(sound);
    made.onended = () => setPlaying((was) => (was === sound ? null : was));
    audio.current.set(sound, made);
    return made;
  };
  const audition = (sound: NotificationSound, intent: 'toggle' | 'restart'): void => {
    if (nextAudition(playing, sound, intent) === null) {
      audio.current.get(sound)?.pause();
      setPlaying(null);
      return;
    }
    stopAll();
    const element = elementFor(sound);
    element.currentTime = 0;
    setPlaying(sound);
    // Pausing an in-flight audition rejects this promise, and the renderer's unhandled-rejection hook would file it as an error.
    void element.play().catch((cause: unknown) => {
      setPlaying((was) => (was === sound ? null : was));
      log('chat').warn('a notification sound could not be auditioned', { error: cause });
    });
  };

  const apply = (next: SoundPickerState): void => {
    setError(undefined);
    setDraft(next);
  };
  // The reducer owns when a re-select clears; read that off the next state rather than re-deriving the condition here.
  const select = (sound: NotificationSound): void => {
    const next = soundPickerReducer(draft, { type: 'select', sound });
    apply(next);
    if (next.selected === null) stopAll();
    else audition(sound, 'restart');
  };
  const toggleMute = (): void => {
    if (!draft.isMuted) stopAll();
    apply(soundPickerReducer(draft, { type: 'toggleMute' }));
  };
  const dismiss = (): void => {
    stopAll();
    setOpen(false);
    setError(undefined);
  };
  const save = (): void => {
    if (isSaving) return;
    setSaving(true);
    setError(undefined);
    void setPreference(soundPickerPreference(draft))
      .then(() => { dismiss(); })
      .catch((cause: unknown) => {
        log('chat').warn('the notification sound choice could not be saved', { error: cause });
        setError(t('chat.sound.saveError'));
      })
      .finally(() => { setSaving(false); });
  };

  return (
    <>
      <IconButton
        label={t('chat.sound.bell')}
        icon={<Icon icon={BellIcon} color="inherit" style={{ width: 18, height: 18 }} />}
        variant="ghost"
        size="sm"
        tooltip={t('chat.sound.bell')}
        data-testid="chat-notifications"
        onClick={() => {
          setDraft(soundPickerFrom(preference));
          setError(undefined);
          setOpen(true);
        }}
      />
      <SoundPickerDialog
        isOpen={isOpen}
        state={draft}
        playing={playing}
        onSelect={select}
        onPlay={(sound) => { audition(sound, 'toggle'); }}
        onToggleMute={toggleMute}
        onSave={save}
        onDismiss={dismiss}
        isSaving={isSaving}
        {...(error === undefined ? {} : { error })}
      />
    </>
  );
}
