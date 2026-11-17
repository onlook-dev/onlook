import { WINDOW_BAR_HEIGHT } from '@studio/events';

/**
 * ⚠️ THESE ARE OVERLAY INSETS, NOT COLUMN BUDGETS (ONL-1889): they say how much
 * canvas a panel covers and subtract nothing from it. Sizing the canvas by them
 * moves React Flow's contents when a panel collapses — 259px on the
 * Design→Interact toggle.
 *
 * ⚠️ `sidebar` and `end` are the DEFAULT widths (ONL-1953); the live ones are in
 * `panels/store.ts`, and a consumer that needs where a panel edge IS reads the
 * store.
 */
export const REGION = {
  /** MAIN sizes the band's own view, so the number lives in `@studio/events`
   * where both processes import it; this is its renderer-side name (ONL-2206). */
  topBar: WINDOW_BAR_HEIGHT,
  sidebar: 259,
  // The rail sits outside each persisted panel width (ONL-2563).
  rail: 60,
  /** `PANEL_DEFAULTS.code` restated, as `sidebar` and `end` are. */
  code: 440,
  // Height only; the band's parent already spans the visible canvas (ONL-2563).
  modeBand: 56,
  /** What the switch RESERVES at the centre of the band; it is content-sized, so
   * labels longer than "Design" / "Interact" outgrow this — re-derive when
   * translations land. */
  modeSwitch: 150,
  /** One constant for BOTH side panels: the design draws one line running the
   * full window width, a relationship between two components that cannot live
   * in either (ONL-1814 — each sized to its own padding, differing by 10px). */
  panelHeader: 42,
  /** `ChatMessageBubble` misbehaves at this width and is handled in the theme,
   * not by sizing the region around it — `apps/studio/src/theme/REGISTER.md`
   * §8.3. */
  end: 307,
} as const;
