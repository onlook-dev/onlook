import { CANVAS_TEXT_FONT_SIZES, CANVAS_TEXT_LINE_HEIGHT, CANVAS_TEXT_WRAP_WIDTH } from '@studio/events';
import { THUMBNAIL_SIZE, type ThumbnailPlacement, type ThumbnailRect } from './bounds.js';

export type ThumbnailTextPlacement = Extract<ThumbnailPlacement, { kind: 'text' }>;

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

export function thumbnailTextAtlas(placements: readonly ThumbnailTextPlacement[], font: string): {
  html: string; width: number; height: number; slots: Map<string, ThumbnailRect>;
} {
  let height = 0;
  const slots = new Map<string, ThumbnailRect>();
  const labels: string[] = [];
  for (const placement of placements.slice(0, 24)) {
    if (placement.text.length > 65_536) continue;
    const width = Math.max(1, Math.round(placement.rect.width));
    const slotHeight = Math.max(1, Math.round(placement.rect.height));
    slots.set(placement.id, { x: 0, y: height, width, height: slotHeight });
    const wrap = placement.wrapWidth === undefined
      ? `width:max-content;max-width:${String(CANVAS_TEXT_WRAP_WIDTH)}px`
      : `width:${String(placement.wrapWidth)}px`;
    labels.push(`<div style="position:absolute;left:0;top:${String(height)}px;width:${String(width)}px;height:${String(slotHeight)}px;overflow:hidden"><div style="${wrap};transform:scale(${String(placement.scale)});transform-origin:top left;font-size:${String(CANVAS_TEXT_FONT_SIZES[placement.size])}px">${escapeHtml(placement.text)}</div></div>`);
    height += slotHeight + 1;
  }
  return {
    width: THUMBNAIL_SIZE.width,
    height: Math.max(1, height),
    slots,
    html: `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:"><style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font})}html,body{margin:0;background:transparent;overflow:hidden}body{font-family:Inter,sans-serif;font-weight:400;color:#fff;line-height:${String(CANVAS_TEXT_LINE_HEIGHT)};white-space:pre-wrap;overflow-wrap:anywhere}</style>${labels.join('')}`,
  };
}

export interface ThumbnailTextPage<Image> {
  render: (active: () => boolean) => Promise<Image>;
  destroy: () => void;
}

export async function withThumbnailTextPage<Image>(create: () => ThumbnailTextPage<Image>, timeoutMs: number): Promise<Image> {
  const deadline = Date.now() + timeoutMs - 50;
  const page = create();
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (Date.now() >= deadline) throw new Error('text preview timeout');
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { active = false; reject(new Error('text preview timeout')); }, deadline - Date.now());
    });
    return await Promise.race([
      page.render(() => active && Date.now() < deadline),
      timeout,
    ]);
  } finally {
    active = false;
    clearTimeout(timer);
    page.destroy();
  }
}
