import { app } from 'electron';
import { CHORD_HINT_DELAY_MS, CHORD_RELEASE_GRACE_MS, chordHintForInput, chordReleasedByPointer } from './chords.js';

const SWAP_SETTLE_MS = 250;

/** Whether the band shows its Tab-jump legends: up once the modifier has been held, away on its release, however that release is learned. */
export class ChordHint {
  private isHeld = false;
  private release: ReturnType<typeof setTimeout> | undefined;
  private show: ReturnType<typeof setTimeout> | undefined;
  private lastSwapAt = 0;
  private readonly tell: (isHeld: boolean) => void;

  constructor(tell: (isHeld: boolean) => void) {
    this.tell = tell;
  }

  /** Deduped: the input stream repeats a held modifier, and every repeat would re-render the strip. */
  push(isHeld: boolean): void {
    // ⚠️ BEFORE the dedupe: a repeat of a held ⌘ is exactly what re-arms the release.
    if (isHeld) {
      if (this.release !== undefined) this.armRelease();
    } else {
      clearTimeout(this.release);
      this.release = undefined;
      clearTimeout(this.show);
      this.show = undefined;
    }
    if (this.isHeld === isHeld) return;
    if (!isHeld) {
      this.set(false);
      return;
    }
    this.show ??= setTimeout(() => {
      this.show = undefined;
      this.set(true);
    }, CHORD_HINT_DELAY_MS);
  }

  /** A jump the modifier drove has just swapped the Tab on screen. */
  noteSwap(): void {
    this.lastSwapAt = Date.now();
    // A ⌘-digit inside the show delay was a tap: its pending show would land after ⌘ is up.
    if (!this.isHeld) {
      clearTimeout(this.show);
      this.show = undefined;
    } else this.armRelease();
  }

  isPending(): boolean {
    return this.isHeld || this.show !== undefined;
  }

  /** The swap's own synthetic pointer events carry no modifiers; a release read from them would drop a held ⌘'s badges. */
  isWithinSwapSettle(): boolean {
    return Date.now() - this.lastSwapAt < SWAP_SETTLE_MS;
  }

  private set(isHeld: boolean): void {
    if (this.isHeld === isHeld) return;
    this.isHeld = isHeld;
    this.tell(isHeld);
  }

  /** ⚠️ Armed only by a ⌘-driven jump: the switch moves focus, so the ⌘ keyUp lands on a view no longer listening (ONL-2364). */
  private armRelease(): void {
    clearTimeout(this.release);
    this.release = setTimeout(() => {
      this.release = undefined;
      this.push(false);
    }, CHORD_RELEASE_GRACE_MS);
  }
}

/** ⚠️ Must not `preventDefault` a digit or ⌃Tab: `menu.ts`'s reader owns those (ONL-2211). `webview` too: a focused guest delivers no keys to its host (ONL-2364). */
export function installChordHint(hint: ChordHint): void {
  app.on('web-contents-created', (_event, contents) => {
    const type = contents.getType();
    if (type !== 'window' && type !== 'webview') return;
    contents.on('before-input-event', (_inputEvent, input) => {
      const held = chordHintForInput(input);
      if (held !== null) hint.push(held);
    });
    contents.on('input-event', (_inputEvent, event) => {
      if (hint.isPending() && !hint.isWithinSwapSettle() && chordReleasedByPointer(event)) hint.push(false);
    });
  });
}
