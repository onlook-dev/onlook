import type { CSSProperties } from 'react';

const FADE_MASK = 'linear-gradient(to right, black calc(100% - 32px), transparent)';

export const ONE_LINE: CSSProperties = { minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden' };
export const FADE: CSSProperties = { maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK };
