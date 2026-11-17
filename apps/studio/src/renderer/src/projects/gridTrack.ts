const COLUMNS = 4;
export const GUTTER = 8;

/* A floor, not a target width: at the design's 273 the grid fell to three
   columns, and pinning the card back there reintroduces the raster's
   right-padding overrun (`apps/studio/src/theme/REGISTER.md` §12). */
const CARD_MIN = 220;

export const CELL = { minWidth: 0 } as const;

/* Not `columns={4}`: that emits `repeat(4, 1fr)`, where a bare `1fr` floors at
   max-content, so one unwrappable project name widens its column — and since
   cards are `AspectRatio`, a wider column is a TALLER card. `minWidth: 0` on the
   cell cannot fix it; the track is sized by the grid. */
export const RESPONSIVE_COLUMNS = { minWidth: CARD_MIN, max: COLUMNS } as const;
