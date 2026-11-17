import { SHIMMER_CREST_FRACTION, SHIMMER_STAGGER_MS, SHIMMER_SWEEP_MS } from '@studio/chat-ui';
import type { TabStatus } from '@studio/events';

import { t } from '@studio/i18n';
import { STATUS_DOT_GAP, STATUS_DOT_SIZE } from './tabs/geometry.js';

/** No slot is reserved: the dot animates its own width open, so it stays mounted; an unmounted one cannot animate out (ONL-2364). */
const STATUS_DOT_MOTION = '220ms cubic-bezier(0.34, 1.2, 0.64, 1)';

export const STATUS_DOT_PULSE = 'studio-status-dot-pulse';

const PULSE_HREF = 'studio-status-dot';

const PULSE_PEAK_PCT = Math.round(SHIMMER_CREST_FRACTION * 1000) / 10;

/* The shimmer's own crest spread, so the dot and a label stay one motion if it is retuned (ONL-2364). */
const PULSE_RULES = `
@keyframes ${STATUS_DOT_PULSE} {
  0% { opacity: 0.45; }
  ${String(PULSE_PEAK_PCT)}% { opacity: 1; }
  ${String(PULSE_PEAK_PCT * 2)}% { opacity: 0.45; }
  100% { opacity: 0.45; }
}
@media (prefers-reduced-motion: reduce) {
  [data-status='working'] { animation: none !important; }
}
`;

const STATUS_INK: Record<TabStatus, string> = {
  working: 'var(--color-text-secondary)',
  done: 'var(--color-icon-teal)',
  waiting: 'var(--color-icon-orange)',
};

// Spelled out: a template-literal key is invisible to `check:strings`.
const STATUS_LABEL: Record<TabStatus, 'tabs.status.working' | 'tabs.status.done' | 'tabs.status.waiting'> = {
  working: 'tabs.status.working',
  done: 'tabs.status.done',
  waiting: 'tabs.status.waiting',
};

export function StatusDot({
  status,
  phase = 0,
  gap = STATUS_DOT_GAP,
  label,
  testId,
}: {
  status?: TabStatus;
  /** A row index, staggered in step with the strip's shimmer (ONL-2200). */
  phase?: number;
  /** The trailing width the sleeve animates open with the dot; 0 where nothing follows it. */
  gap?: number;
  /** What this dot means on a surface the tab vocabulary does not name (ONL-2499). */
  label?: string;
  testId: string;
}): React.JSX.Element {
  const isShown = status !== undefined;
  return (
    <span
      aria-hidden={isShown ? undefined : true}
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        height: STATUS_DOT_SIZE,
        width: isShown ? STATUS_DOT_SIZE + gap : 0,
        transition: `width ${STATUS_DOT_MOTION}`,
      }}
    >
      <style href={PULSE_HREF} precedence="medium">
        {PULSE_RULES}
      </style>
      <span
        role={isShown ? 'img' : undefined}
        aria-label={isShown ? label ?? t(STATUS_LABEL[status]) : undefined}
        data-status={status}
        data-testid={testId}
        style={{
          width: STATUS_DOT_SIZE,
          height: STATUS_DOT_SIZE,
          borderRadius: '50%',
          background: isShown ? STATUS_INK[status] : 'transparent',
          transform: isShown ? 'scale(1)' : 'scale(0)',
          transition: `transform ${STATUS_DOT_MOTION}, background-color ${STATUS_DOT_MOTION}`,
          animation: status === 'working' ? `${STATUS_DOT_PULSE} ${SHIMMER_SWEEP_MS}ms linear infinite` : undefined,
          animationDelay: status === 'working' ? `${String(phase * SHIMMER_STAGGER_MS)}ms` : undefined,
        }}
      />
    </span>
  );
}
