import type { Input } from 'electron';
import { isMac } from '../env/platform.js';

export function isSaveChord(
  input: Pick<Input, 'type' | 'key' | 'meta' | 'control' | 'alt' | 'shift'>,
  mac = isMac(),
): boolean {
  if (input.type !== 'keyDown') return false;
  if (input.alt || input.shift) return false;
  if (mac ? !input.meta || input.control : !input.control || input.meta) return false;
  return input.key.toLowerCase() === 's';
}
