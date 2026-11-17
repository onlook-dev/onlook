import type { Input } from 'electron';
import { isMac } from '../env/platform.js';

export function isChatFocusChord(input: Pick<Input, 'type' | 'key' | 'meta' | 'control' | 'alt' | 'shift' | 'isAutoRepeat'>, mac = isMac()): boolean {
  return input.type === 'keyDown' && !input.isAutoRepeat && input.key.toLowerCase() === 'c' && input.shift && !input.alt && (mac ? input.meta && !input.control : input.control && !input.meta);
}
