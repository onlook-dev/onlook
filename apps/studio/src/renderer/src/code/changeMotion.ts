import { StateEffect } from '@codemirror/state';
import { ViewPlugin, type EditorView, type ViewUpdate } from '@codemirror/view';

export const agentCodeChange = StateEffect.define<boolean>();
const MAX_LINES = 80;
const HIGHLIGHT_MS = 1400;
type MotionPreference = Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;

export function animateEditedLine(line: Pick<HTMLElement, 'animate'>, background: string, motion: MotionPreference): () => void {
  const animations = [line.animate([
    { backgroundColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)' },
    { backgroundColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)', offset: 0.18 },
    { backgroundColor: background },
  ], { duration: HIGHLIGHT_MS, easing: 'ease-out' })];
  if (!motion.matches) animations.push(line.animate([
    { transform: 'translateX(3px)', opacity: 0.7 },
    { transform: 'translateX(0)', opacity: 1 },
  ], { duration: 180, easing: 'cubic-bezier(0.2, 0, 0.2, 1)' }));
  let stopped = false;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    motion.removeEventListener('change', stop);
    for (const animation of animations) animation.cancel();
  };
  motion.addEventListener('change', stop);
  void Promise.all(animations.map(animation => animation.finished)).then(stop, stop);
  return stop;
}

export class CodeChangeMotion {
  private frame: number | null = null;
  private stops: (() => void)[] = [];
  constructor(private readonly view: EditorView) {
    view.scrollDOM.addEventListener('scroll', this.clear);
  }

  private clear = (): void => {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    for (const stop of this.stops) stop();
    this.stops = [];
  };

  update(update: ViewUpdate): void {
    if (!update.docChanged && !update.viewportChanged) return;
    this.clear();
    if (!update.transactions.some(transaction => transaction.effects.some(effect => effect.is(agentCodeChange) && effect.value))) return;
    const ranges: { from: number; to: number }[] = [];
    update.changes.iterChangedRanges((_from, _to, from, to) => ranges.push({ from, to }));
    const { scrollTop, scrollLeft } = this.view.scrollDOM;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      if (this.view.scrollDOM.scrollTop !== scrollTop || this.view.scrollDOM.scrollLeft !== scrollLeft) return;
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const targets: { line: HTMLElement; background: string }[] = [];
      const viewport = this.view.scrollDOM.getBoundingClientRect();
      const top = viewport.top + this.view.scrollDOM.clientTop;
      const bottom = top + this.view.scrollDOM.clientHeight;
      for (const line of this.view.contentDOM.querySelectorAll<HTMLElement>('.cm-line')) {
        const bounds = line.getBoundingClientRect();
        if (bounds.bottom <= top || bounds.top >= bottom) continue;
        const position = this.view.posAtDOM(line);
        const span = this.view.state.doc.lineAt(position);
        if (!ranges.some(range => range.from <= span.to && range.to >= span.from)) continue;
        targets.push({ line, background: getComputedStyle(line).backgroundColor });
        if (targets.length === MAX_LINES) break;
      }
      this.stops = targets.map(({ line, background }) => animateEditedLine(line, background, motion));
    });
  }

  destroy(): void {
    this.view.scrollDOM.removeEventListener('scroll', this.clear);
    this.clear();
  }
}

export const codeChangeMotion = ViewPlugin.fromClass(CodeChangeMotion);
