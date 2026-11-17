export interface Sides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Band {
  kind: 'margin' | 'padding';
  side: keyof Sides;
  left: number;
  top: number;
  width: number;
  height: number;
  /** The side's own value, which the band's thickness equals. */
  value: number;
}

/** The margin ring outside a border box and the padding ring inside its border, as the bands a selected element is shaded with. The top and bottom margin bands take the corners. */
export function spacingBands(
  rect: { left: number; top: number; width: number; height: number },
  margin: Sides,
  border: Sides,
  padding: Sides,
): Band[] {
  const bands: Band[] = [];
  const add = (band: Band): void => {
    if (band.value > 0 && band.width > 0 && band.height > 0) bands.push(band);
  };
  const m = clampNegative(margin);
  const outerLeft = rect.left - m.left;
  const outerWidth = rect.width + m.left + m.right;
  add({ kind: 'margin', side: 'top', left: outerLeft, top: rect.top - m.top, width: outerWidth, height: m.top, value: m.top });
  add({ kind: 'margin', side: 'bottom', left: outerLeft, top: rect.top + rect.height, width: outerWidth, height: m.bottom, value: m.bottom });
  add({ kind: 'margin', side: 'left', left: outerLeft, top: rect.top, width: m.left, height: rect.height, value: m.left });
  add({ kind: 'margin', side: 'right', left: rect.left + rect.width, top: rect.top, width: m.right, height: rect.height, value: m.right });

  const innerLeft = rect.left + border.left;
  const innerTop = rect.top + border.top;
  const innerWidth = rect.width - border.left - border.right;
  const innerHeight = rect.height - border.top - border.bottom;
  const middle = innerHeight - padding.top - padding.bottom;
  add({ kind: 'padding', side: 'top', left: innerLeft, top: innerTop, width: innerWidth, height: padding.top, value: padding.top });
  add({ kind: 'padding', side: 'bottom', left: innerLeft, top: innerTop + innerHeight - padding.bottom, width: innerWidth, height: padding.bottom, value: padding.bottom });
  add({ kind: 'padding', side: 'left', left: innerLeft, top: innerTop + padding.top, width: padding.left, height: middle, value: padding.left });
  add({ kind: 'padding', side: 'right', left: innerLeft + innerWidth - padding.right, top: innerTop + padding.top, width: padding.right, height: middle, value: padding.right });
  return bands;
}

/** A negative margin pulls a neighbour in; there is no space to shade. */
function clampNegative(sides: Sides): Sides {
  return {
    top: Math.max(0, sides.top),
    right: Math.max(0, sides.right),
    bottom: Math.max(0, sides.bottom),
    left: Math.max(0, sides.left),
  };
}
