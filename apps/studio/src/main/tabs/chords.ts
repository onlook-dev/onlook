// Off the input stream: a focused guest delivers no keys to the host document (ONL-2364).
import type { Input, InputEvent } from 'electron';
import { isMac } from '../env/platform.js';

type ChordInput = Pick<Input, 'type' | 'key' | 'meta' | 'control' | 'alt' | 'shift'>;

/** ⌥ and ⇧ forms belong to other bindings. */
function isChordModifier(input: ChordInput, mac: boolean): boolean {
  if (input.alt || input.shift) return false;
  return mac ? input.meta && !input.control : input.control && !input.meta;
}

/** A ⌘-digit jump can drop the ⌘ keyUp where nothing listens; a real hold repeats and re-arms this, so only a lost release reaches it (ONL-2364). */
export const CHORD_RELEASE_GRACE_MS = 1000;

/** A tap of ⌘ on its way to ⌘C or ⌘V never lasts this long, so a hint shown only after it never flashes under typing. */
export const CHORD_HINT_DELAY_MS = 200;

const isTabDigit = (key: string): boolean => key.length === 1 && key >= '1' && key <= '9';

/** `null` when the event says nothing — answering `false` blinks the legends off under a held ⌘. */
export function chordHintForInput(input: ChordInput, mac = isMac()): boolean | null {
  if (input.type !== 'keyDown' && input.type !== 'keyUp') return null;
  // A keyUp of the modifier still carries the flag on some platforms; releasing ⌘ must put the legends away.
  if (input.type === 'keyUp' && (input.key === 'Meta' || input.key === 'Control')) return false;
  if (!isChordModifier(input, mac)) return false;
  if (input.type === 'keyUp' || isTabDigit(input.key)) return null;
  return input.key === (mac ? 'Meta' : 'Control');
}

/** After a ⌘-digit swap the ⌘ keyUp never reaches a listener, so the first pointer event without ⌘ is the release (ONL-2364). */
export function chordReleasedByPointer(event: Pick<InputEvent, 'type' | 'modifiers'>, mac = isMac()): boolean {
  if (!event.type.startsWith('mouse') && !event.type.startsWith('pointer')) return false;
  // A view swap under a still pointer synthesises these with no modifiers held.
  if (/enter|leave/i.test(event.type)) return false;
  const modifiers = event.modifiers ?? [];
  return mac ? !modifiers.includes('meta') && !modifiers.includes('cmd') && !modifiers.includes('command') : !modifiers.includes('control') && !modifiers.includes('ctrl');
}
