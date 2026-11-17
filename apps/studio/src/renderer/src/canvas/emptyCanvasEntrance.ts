export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Percentages of the card's own box. */
interface Origin {
  x: number;
  y: number;
}

const DEFAULT_ORIGIN: Origin = { x: 50, y: 60 };

export interface Pose {
  box: Box;
  ry: number;
  rz: number;
  scale?: number;
  origin?: Origin;
}

export interface WrapperPaint {
  opacity: number;
  filter: string;
  transform: string;
  transformOrigin: string;
}

export type EntranceRole = 'page' | 'photo';

const span = (p: number, from: number, to: number) => Math.min(1, Math.max(0, (p - from) / (to - from)));

export function poseTransform(pose: Pose): string {
  return `translate(${String(pose.box.left)}px, ${String(pose.box.top)}px) rotateY(${String(pose.ry)}deg) rotateZ(${String(pose.rz)}deg) scale(${String(pose.scale ?? 1)})`;
}

export function originCss(pose: Pose): string {
  const { x, y } = pose.origin ?? DEFAULT_ORIGIN;
  return `${String(x)}% ${String(y)}%`;
}

function pivot(pose: Pose): { x: number; y: number } {
  const { x, y } = pose.origin ?? DEFAULT_ORIGIN;
  return { x: pose.box.left + (x / 100) * pose.box.width, y: pose.box.top + (y / 100) * pose.box.height };
}

/** For a wrapper around a card already in `pose`; `null` once the card rests and the wrapper carries no paint. */
export function entranceWrapperPaint(role: EntranceRole, pose: Pose, stageCentre: number, p: number): WrapperPaint | null {
  if (p >= 1) return null;
  const at = pivot(pose);
  const fromCentre = stageCentre - (pose.box.left + pose.box.width / 2);
  const transformOrigin = `${String(at.x)}px ${String(at.y)}px`;
  if (role === 'page') {
    const land = span(p, 0, 0.5);
    const spread = span(p, 0.3, 1);
    return {
      opacity: span(p, 0, 0.3),
      filter: land < 1 ? `blur(${String(2.5 * (1 - span(p, 0, 0.45)))}px)` : 'none',
      transform: `translateX(${String(fromCentre * (1 - spread))}px) translateY(${String(6 * (1 - land))}px) rotateZ(${String(-pose.rz * (1 - spread))}deg) scale(${String(0.97 + 0.03 * land)})`,
      transformOrigin,
    };
  }
  const fan = span(p, 0.3, 1);
  return {
    opacity: span(p, 0.3, 0.42),
    filter: 'none',
    transform: `translateX(${String(fromCentre * (1 - fan))}px) rotateZ(${String(-pose.rz * (1 - fan))}deg) scale(${String(0.8 + 0.2 * fan)})`,
    transformOrigin,
  };
}
