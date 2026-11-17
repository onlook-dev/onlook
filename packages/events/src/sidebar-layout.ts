/** The project panel's split between its two sections, per project. */
export interface SidebarLayout {
  /** The Pages section's height in pixels; absent means it hugs its rows (ONL-2488). */
  pagesHeight?: number;
}

/** A value outside these is dropped to no stored split, not clamped (`main/sidebar-layout/state.ts`). */
export const SIDEBAR_LAYOUT_LIMITS = {
  pagesHeight: { min: 24, max: 2000 },
} as const;
