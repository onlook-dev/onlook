export interface PanelsState {
  sidebar: number;
  end: number;
  /** The left panel's other view, which the rail switches to (ONL-2563). Its own key, so neither view inherits the other's width or range. */
  code: number;
}

/** `REGION.sidebar` / `REGION.end` / `REGION.code` restated: this package cannot import the renderer. */
export const PANEL_DEFAULTS: PanelsState = { sidebar: 259, end: 307, code: 440 };

/** A value outside these is dropped to the default, not clamped (`main/panels/state.ts`). */
export const PANEL_LIMITS = {
  sidebar: { min: 200, max: 480 },
  end: { min: 280, max: 800 },
  code: { min: 280, max: 900 },
} as const;
