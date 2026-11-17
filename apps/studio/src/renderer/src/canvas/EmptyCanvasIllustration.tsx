import { memo, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject, type SVGProps } from 'react';
import { Stack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { CharMorphText } from '@studio/chat-ui';
import { t } from '@studio/i18n';
import { hasJoinedCharacters, shortName, type EmptyCanvasState } from './emptyCanvasState.js';
import { entranceWrapperPaint, originCss, poseTransform, type Box, type Pose, type WrapperPaint } from './emptyCanvasEntrance.js';
import { prefersReducedMotion, step, type Spring } from './spring.js';
import type { IdeaKind } from './ideas/ideas.js';
import { FollowsCanvas } from './ideas/FollowsCanvas.jsx';
import { ReadyCanvas } from './ideas/ReadyCanvas.jsx';
import './canvas.css';

type Illustrated = Exclude<EmptyCanvasState, { kind: 'ideas' } | { kind: 'quiet' } | { kind: 'unknown' }>;
type Kind = Illustrated['kind'];

const HAIR = 'var(--studio-illo-hairline)';
const DASH = 'var(--studio-illo-dash)';
const DASH_PATTERN = '5 3';
const DROP = '0 18px 40px -12px var(--studio-illo-shadow)';
const INK = 'var(--studio-illo-ink-soft)';
const INK_STRONG = 'var(--studio-illo-ink)';
const SOFT_FILL = 'var(--studio-illo-fill)';

const STAGE = { width: 280, height: 150 };
const COPY_LONG_MS = 30_000;

const SPRING = 'cubic-bezier(.32,.72,0,1)';
const MORPH_MS = 620;
const morph = (props: string[]) => props.map((p) => `${p} ${String(MORPH_MS)}ms ${SPRING}`).join(', ');

const COPY_LOOP = '6.5s linear infinite';
const CARD_HEIGHT = 128;
/** The scan line overshoots the card by a tenth at each end, so it enters and leaves rather than popping. */
const SCAN_OVERSHOOT = CARD_HEIGHT * 0.1;
const BAND_HALF = 18;
const BAND_MASK = 'linear-gradient(to bottom, transparent, #000 50%, transparent)';
const ACROSS: CSSProperties = { position: 'absolute', left: 0, right: 0 };
/** The scan keyframes in styles.css read these. */
const SCAN_VARS = {
  '--empty-scan-from': `${String(-SCAN_OVERSHOOT)}px`,
  '--empty-scan-to': `${String(CARD_HEIGHT + SCAN_OVERSHOOT)}px`,
  '--empty-reveal-from': `${String(-(CARD_HEIGHT + 2 * SCAN_OVERSHOOT))}px`,
} as CSSProperties;

const block = (width: number | string, height: number, radius = 2, bg = INK): CSSProperties => ({
  width,
  height,
  borderRadius: radius,
  background: bg,
  flexShrink: 0,
  display: 'block',
});

const LEFT = { width: 124, height: CARD_HEIGHT };
const RIGHT = { width: 148, height: CARD_HEIGHT };
const at = (left: number, top: number, size: { width: number; height: number }): Box => ({ left, top, ...size });
const FAN_ORIGIN = { x: 50, y: 190 };
const FAN: { left: Pose; right: Pose } = {
  left: { box: at(36, 10, LEFT), ry: 0, rz: -5, origin: FAN_ORIGIN },
  right: { box: at(96, 6, RIGHT), ry: 0, rz: 4, origin: FAN_ORIGIN },
};
const HEAD_ON_LEFT: { left: Pose; right: Pose } = {
  left: { box: at(62, 11, LEFT), ry: 6, rz: -2.5, scale: 0.9 },
  right: { box: at(50, 12, RIGHT), ry: 6, rz: -2.5 },
};
const POSES: Record<Kind, { left: Pose; right: Pose }> = {
  copying: FAN,
  ready: FAN,
  question: HEAD_ON_LEFT,
  failed: HEAD_ON_LEFT,
};

const WAVE_BLOCKS: { x: number; y: number; w: number; h: number; r?: number }[] = [
  { x: 12, y: 12, w: 8, h: 8, r: 4 },
  { x: -28, y: 14, w: 12, h: 3 },
  { x: -12, y: 14, w: 12, h: 3 },
  { x: 12, y: 32, w: 88, h: 7 },
  { x: 12, y: 42, w: 60, h: 7 },
  { x: 12, y: 54, w: 74, h: 3 },
  { x: 12, y: 64, w: 26, h: 8, r: 4 },
  { x: 42, y: 64, w: 26, h: 8, r: 4 },
];

function DashedOutline({ radius }: { radius: number }) {
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      <rect x="0" y="0" width="100%" height="100%" rx={radius} fill="none" stroke={DASH} strokeWidth="0.5" strokeDasharray={DASH_PATTERN} />
    </svg>
  );
}

function BlockPage({ width, height = 128, dashed }: { width: number; height?: number; dashed?: boolean }) {
  const column = (width - 24 - 8) / 3;
  const tiles = [0, 1, 2].map((c) => ({ x: 12 + c * (column + 4), y: height - 36, w: column, h: 24, r: 3 }));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {[...WAVE_BLOCKS, ...tiles].map((raw) => {
        const b = raw.x < 0 ? { ...raw, x: width + raw.x - 12 } : raw;
        return (
          <span
            key={`${String(raw.x)}:${String(raw.y)}`}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              borderRadius: b.r ?? 2,
              background: dashed ? 'transparent' : INK,
            }}
          >
            {dashed && <DashedOutline radius={b.r ?? 2} />}
          </span>
        );
      })}
    </div>
  );
}

function Photo() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--studio-illo-photo)' }}>
      <svg width="100%" height="100%" viewBox="0 0 112 112" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="78" cy="34" r="9" style={{ fill: INK_STRONG }} />
        <path d="M0 112 L0 84 L34 56 L58 76 L76 62 L112 88 L112 112 Z" style={{ fill: HAIR }} />
      </svg>
    </div>
  );
}

function Pill({ width, on }: { width: number; on?: boolean }) {
  return (
    <span
      style={{
        height: 16,
        padding: '0 7px',
        borderRadius: 5,
        display: 'inline-flex',
        alignItems: 'center',
        background: on ? SOFT_FILL : 'transparent',
        border: `0.5px solid ${on ? 'transparent' : HAIR}`,
        boxSizing: 'border-box',
      }}
    >
      <span style={block(width, 4, 2, on ? 'var(--studio-illo-fill-ink)' : INK_STRONG)} />
    </span>
  );
}

function AnswersBody() {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '18px 14px 14px', display: 'flex', flexDirection: 'column', gap: 7, boxSizing: 'border-box' }}>
      <span style={block('90%', 5)} />
      <span style={block('62%', 5)} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
        <Pill width={18} on />
        <Pill width={26} />
        <Pill width={14} />
        <Pill width={22} />
        <Pill width={16} />
      </div>
      <span style={{ marginTop: 'auto', height: 16, borderRadius: 5, background: SOFT_FILL }} />
    </div>
  );
}

const FROST: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backdropFilter: 'blur(8px) brightness(1.25)',
  WebkitBackdropFilter: 'blur(8px) brightness(1.25)',
  background: 'linear-gradient(180deg, var(--studio-illo-frost-top), var(--studio-illo-frost-bottom))',
};

type Shape = { kind: 'text'; char: string; x: number; y: number; size: number } | { kind: 'polygon'; points: string };

const glyphFont = (size: number) => `600 ${String(size)}px -apple-system, system-ui, sans-serif`;
const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function shapeMarkup(shape: Shape): string {
  return shape.kind === 'text'
    ? `<text x="${String(shape.x)}" y="${String(shape.y)}" text-anchor="middle" style="font:${glyphFont(shape.size)}" fill="black">${escapeXml(shape.char)}</text>`
    : `<polygon points="${shape.points}" fill="black"/>`;
}

function ShapeElement({ shape, ...paint }: { shape: Shape } & SVGProps<SVGTextElement & SVGPolygonElement>) {
  return shape.kind === 'text' ? (
    <text x={shape.x} y={shape.y} textAnchor="middle" style={{ font: glyphFont(shape.size) }} {...paint}>
      {shape.char}
    </text>
  ) : (
    <polygon points={shape.points} strokeLinejoin="miter" {...paint} />
  );
}

function xPoints(cx: number, cy: number, arm: number, half: number): string {
  const plus: [number, number][] = [
    [half, -arm], [half, -half], [arm, -half], [arm, half], [half, half], [half, arm],
    [-half, arm], [-half, half], [-arm, half], [-arm, -half], [-half, -half], [-half, -arm],
  ];
  const r = Math.PI / 4;
  const [c, sn] = [Math.cos(r), Math.sin(r)];
  return plus.map(([x, y]) => `${(cx + x * c - y * sn).toFixed(2)},${(cy + x * sn + y * c).toFixed(2)}`).join(' ');
}

const SHADOW_PAD = 80;
const region = { x: -SHADOW_PAD, y: -SHADOW_PAD, width: STAGE.width + SHADOW_PAD * 2, height: STAGE.height + SHADOW_PAD * 2 };

/** Layers fade themselves (a wrapper's opacity breaks the backdrop-filter); the shadow sits apart, or the frost's mask clips it. */
function GlassShape({ shape, opacity }: { shape: Shape; opacity: number }) {
  const id = useId();
  const fade: CSSProperties = { opacity, transition: morph(['opacity']) };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(STAGE.width)}" height="${String(STAGE.height)}">${shapeMarkup(shape)}</svg>`;
  const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return (
    <>
      <svg width={STAGE.width} height={STAGE.height} style={{ position: 'absolute', inset: 0, overflow: 'visible', ...fade }}>
        <defs>
          <filter id={`${id}-blur`} filterUnits="userSpaceOnUse" {...region}>
            <feGaussianBlur stdDeviation="15" />
          </filter>
          <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" {...region}>
            <rect {...region} fill="white" />
            <ShapeElement shape={shape} fill="black" />
          </mask>
        </defs>
        <g mask={`url(#${id}-cut)`}>
          <g transform="translate(0 18)" filter={`url(#${id}-blur)`}>
            <ShapeElement shape={shape} fill="var(--studio-illo-frost-shadow)" />
          </g>
        </g>
      </svg>
      <div style={{ ...FROST, WebkitMaskImage: mask, maskImage: mask, ...fade }} />
      <svg width={STAGE.width} height={STAGE.height} style={{ position: 'absolute', inset: 0, ...fade }}>
        <ShapeElement shape={shape} fill="none" stroke="var(--studio-illo-frost-edge)" strokeWidth="0.5" />
      </svg>
    </>
  );
}

const QUESTION_SHAPE = (): Shape => ({ kind: 'text', char: t('canvas.empty.question.mark'), x: 214, y: 128, size: 150 });
const CROSS_SHAPE: Shape = { kind: 'polygon', points: xPoints(212, 74, 46, 8) };

/** Mounted while `on` and through its fade-out; `visible` turns on a frame after mount, so an entering fade has a start. */
export function usePresence(on: boolean, fadeMs = MORPH_MS): { present: boolean; visible: boolean } {
  const [present, setPresent] = useState(on);
  const [armed, setArmed] = useState(on);
  if (on && !present) setPresent(true);
  useEffect(() => {
    if (!on && !present) return;
    if (!on) {
      setArmed(false);
      const timer = window.setTimeout(() => setPresent(false), fadeMs);
      return () => window.clearTimeout(timer);
    }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setArmed(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [on, present, fadeMs]);
  return { present, visible: on && armed };
}

function Layer({ on, children }: { on: boolean; children: ReactNode }) {
  const { present, visible } = usePresence(on);
  return (
    <div
      data-empty-layer
      style={{
        position: 'absolute',
        inset: 0,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'scale(0.985)',
        filter: visible ? 'none' : 'blur(3px)',
        transition: morph(['opacity', 'transform', 'filter']),
      }}
    >
      {present && children}
    </div>
  );
}

function MorphCard({ pose, fading, ghost = false, children }: { pose: Pose; fading: boolean; ghost?: boolean; children: ReactNode }) {
  return (
    <div
      data-empty-card
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: pose.box.width,
        height: pose.box.height,
        transformOrigin: originCss(pose),
        transformStyle: 'preserve-3d',
        transform: poseTransform(pose),
        opacity: fading ? 0 : 1,
        transition: morph(['transform', 'transform-origin', 'opacity']),
      }}
    >
      <div style={{ position: 'absolute', inset: 0, borderRadius: 8, boxShadow: DROP }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          border: `0.5px solid ${ghost ? 'transparent' : HAIR}`,
          background: ghost ? 'var(--studio-illo-ground)' : 'var(--studio-illo-card)',
          overflow: 'hidden',
          transition: morph(['background-color', 'border-color']),
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, var(--studio-illo-highlight) 0%, transparent 40%)',
          opacity: ghost ? 0 : 1,
          transition: morph(['opacity']),
        }}
      />
      <div style={{ position: 'absolute', inset: 0, opacity: ghost ? 1 : 0, transition: morph(['opacity']) }}>
        <DashedOutline radius={8} />
      </div>
    </div>
  );
}

const ENTRANCE_DELAY_MS = 450;
const TIME_SCALE = 0.42;
/** Caps one frame's step, so a boot stall cannot jump the entrance to its end. */
const STALL_MS = 24;

/** Set by the first mount in this renderer, which plays the entrance into whatever state it opens on; later mounts fade in. */
let entrancePlayed = false;

type Entrance = 'full' | 'quiet';

function useEntrance(): Entrance {
  const [mode] = useState<Entrance>(() => (entrancePlayed || prefersReducedMotion() ? 'quiet' : 'full'));
  useEffect(() => {
    entrancePlayed = true;
  }, []);
  return mode;
}

function paintWrapper(el: HTMLDivElement | null, paint: WrapperPaint | null): void {
  if (!el) return;
  if (paint) el.style.transition = 'none';
  el.style.opacity = paint ? String(paint.opacity) : '';
  el.style.filter = paint ? paint.filter : '';
  el.style.transform = paint ? paint.transform : '';
  el.style.transformOrigin = paint ? paint.transformOrigin : '';
}

/** Paints wrappers React does not style, so the cards' own pose and transitions are never touched. */
function useSpringEntrance(
  play: boolean,
  kind: Kind,
  page: RefObject<HTMLDivElement | null>,
  photo: RefObject<HTMLDivElement | null>,
): void {
  const [first] = useState(kind);
  const [entering, setEntering] = useState(play);
  if (entering && kind !== first) setEntering(false);
  const active = entering && kind === first;
  useLayoutEffect(() => {
    if (!active) return;
    const centre = STAGE.width / 2;
    const { left, right } = POSES[first];
    const paint = (p: number) => {
      paintWrapper(page.current, entranceWrapperPaint('page', right, centre, p));
      paintWrapper(photo.current, entranceWrapperPaint('photo', left, centre, p));
    };
    const spring: Spring = { value: 0, velocity: 0, target: 1 };
    paint(0);
    let last: number | undefined;
    let frame = 0;
    let settled = false;
    const tick = (now: number) => {
      const raw = now - (last ?? now);
      last = now;
      settled = step(spring, (Math.min(raw, STALL_MS) / 1000) * TIME_SCALE);
      paint(settled ? 1 : spring.value);
      if (settled) setEntering(false);
      else frame = requestAnimationFrame(tick);
    };
    const delay = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, ENTRANCE_DELAY_MS);
    return () => {
      window.clearTimeout(delay);
      cancelAnimationFrame(frame);
      if (settled) return;
      for (const el of [page.current, photo.current]) {
        if (!el) continue;
        el.style.transition = morph(['opacity', 'filter', 'transform']);
        paintWrapper(el, null);
      }
    };
  }, [active, first, page, photo]);
}

const WRAP: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', transformStyle: 'preserve-3d' };

type Pass = 'read' | 'make';

function ScanLine({ pass }: { pass: Pass }) {
  return (
    <div
      style={{
        ...ACROSS,
        top: -1,
        height: 2,
        background: 'linear-gradient(90deg, transparent, var(--studio-illo-scan), transparent)',
        boxShadow: '0 0 12px 2px var(--studio-illo-scan-glow)',
        opacity: 0,
        animation: `empty-scan-${pass} ${COPY_LOOP}, empty-glow-${pass} ${COPY_LOOP}`,
      }}
    />
  );
}

/** A soft window riding the scan line; its contents counter-move, so they stay put on the card. */
function Band({ pass, children }: { pass: Pass; children: ReactNode }) {
  return (
    <div
      style={{
        ...ACROSS,
        top: -BAND_HALF,
        height: BAND_HALF * 2,
        overflow: 'hidden',
        WebkitMaskImage: BAND_MASK,
        maskImage: BAND_MASK,
        opacity: 0,
        animation: `empty-scan-${pass} ${COPY_LOOP}, empty-glow-${pass} ${COPY_LOOP}`,
      }}
    >
      <div style={{ ...ACROSS, top: BAND_HALF, height: CARD_HEIGHT, animation: `empty-scan-${pass}-back ${COPY_LOOP}` }}>{children}</div>
    </div>
  );
}

/** Shows the card above the scan line; at rest it shows the whole card. */
function Reveal({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...ACROSS,
        top: 0,
        height: CARD_HEIGHT + SCAN_OVERSHOOT,
        overflow: 'hidden',
        animation: `empty-reveal ${COPY_LOOP}, empty-fill ${COPY_LOOP}`,
      }}
    >
      <div style={{ ...ACROSS, top: 0, height: CARD_HEIGHT, animation: `empty-reveal-back ${COPY_LOOP}` }}>{children}</div>
    </div>
  );
}

function ScanEdge() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 8,
        border: '0.5px solid var(--studio-illo-scan)',
        boxShadow: '0 0 8px var(--studio-illo-scan-halo)',
      }}
    />
  );
}

function LitPage({ width }: { width: number }) {
  return (
    <div className="empty-copy-lit" style={{ position: 'absolute', inset: 0 }}>
      <BlockPage width={width} />
    </div>
  );
}

function Art({ kind, entrance, leaving }: { kind: Kind; entrance: Entrance; leaving: boolean }) {
  const pageRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  useSpringEntrance(entrance === 'full', kind, pageRef, photoRef);
  const copying = kind === 'copying';
  const question = kind === 'question';
  const failed = kind === 'failed';
  const poses = POSES[kind];
  const glyph = usePresence(question);
  const cross = usePresence(failed);
  return (
    <div style={{ position: 'relative', ...STAGE, perspective: 900, ...SCAN_VARS }} aria-hidden>
      <div ref={photoRef} style={WRAP}>
        <MorphCard pose={poses.left} fading={leaving}>
          <Layer on={kind !== 'ready'}>
            <div style={{ position: 'absolute', inset: 0, opacity: copying ? 1 : 0.5, transition: morph(['opacity']) }}>
              <BlockPage width={LEFT.width} height={LEFT.height} />
            </div>
          </Layer>
          <Layer on={copying}>
            <Band pass="read">
              <LitPage width={LEFT.width} />
              <ScanEdge />
            </Band>
            <ScanLine pass="read" />
          </Layer>
          <Layer on={kind === 'ready'}>
            <Photo />
          </Layer>
        </MorphCard>
      </div>
      <div ref={pageRef} style={WRAP}>
        <MorphCard pose={poses.right} fading={leaving} ghost={failed}>
          <Layer on={copying}>
            <Reveal>
              <BlockPage width={RIGHT.width} />
              <Band pass="make">
                <LitPage width={RIGHT.width} />
              </Band>
            </Reveal>
            <Band pass="make">
              <ScanEdge />
            </Band>
            <ScanLine pass="make" />
          </Layer>
          <Layer on={kind === 'ready'}>
            <BlockPage width={RIGHT.width} />
          </Layer>
          <Layer on={question}>
            <AnswersBody />
          </Layer>
          <Layer on={failed}>
            <BlockPage width={RIGHT.width} dashed />
          </Layer>
        </MorphCard>
      </div>
      {glyph.present && (
        <div
          data-empty-card
          style={{
            ...WRAP,
            transform: glyph.visible ? 'translate(0, 0) rotate(6deg) scale(1)' : 'translate(-18px, 14px) rotate(-4deg) scale(0.8)',
            transformOrigin: '214px 75px',
            transition: morph(['transform']),
          }}
        >
          <GlassShape shape={QUESTION_SHAPE()} opacity={glyph.visible && !leaving ? 1 : 0} />
        </div>
      )}
      {cross.present && (
        <div
          data-empty-card
          style={{
            ...WRAP,
            transform: cross.visible ? 'scale(1)' : 'scale(0.8)',
            transformOrigin: '212px 74px',
            transition: morph(['transform']),
          }}
        >
          <GlassShape shape={CROSS_SHAPE} opacity={cross.visible && !leaving ? 1 : 0} />
        </div>
      )}
    </div>
  );
}

function caption(state: Illustrated, long: boolean): { title: string; body: string } {
  switch (state.kind) {
    case 'copying':
      return long
        ? { title: t('canvas.empty.copyingLong.title'), body: t('canvas.empty.copyingLong.body') }
        : {
            title: t('canvas.empty.copying.title'),
            body:
              state.repo === undefined
                ? t('canvas.empty.copying.bodyNameless')
                : t('canvas.empty.copying.body', { repo: shortName(state.repo) }),
          };
    case 'question':
      return { title: t('canvas.empty.question.title'), body: t('canvas.empty.question.body') };
    case 'failed':
      return {
        title: t(state.stage === 'preview' ? 'canvas.empty.failed.preview.title' : 'canvas.empty.failed.setup.title'),
        body: t('canvas.empty.failed.body'),
      };
    case 'ready':
      return { title: t('canvas.empty.title'), body: t('canvas.empty.body') };
  }
}

/** True once `since` is at least `COPY_LONG_MS` ago; false while no copy runs. */
function useLongCopy(since: number | undefined): boolean {
  const [long, setLong] = useState(() => since !== undefined && Date.now() - since >= COPY_LONG_MS);
  useEffect(() => {
    if (since === undefined) {
      setLong(false);
      return;
    }
    const left = since + COPY_LONG_MS - Date.now();
    setLong(left <= 0);
    if (left <= 0) return;
    const timer = window.setTimeout(() => setLong(true), left);
    return () => window.clearTimeout(timer);
  }, [since]);
  return long;
}

/** The character morph cannot wrap or join characters; such a line falls back to plain wrapping text. */
const FIT_MARGIN_PX = 1;

function CaptionLine({ text }: { text: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [fits, setFits] = useState(true);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () =>
      setFits((probe.current?.getBoundingClientRect().width ?? 0) + FIT_MARGIN_PX <= el.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (probe.current) observer.observe(probe.current);
    let live = true;
    void document.fonts.ready.then(() => {
      if (live) measure();
    });
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [text]);
  return (
    <span ref={box} style={{ position: 'relative', display: 'block', width: '100%', textAlign: 'center' }}>
      <span ref={probe} aria-hidden style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', left: 0, top: 0 }}>
        {text}
      </span>
      {fits && !hasJoinedCharacters(text) ? <CharMorphText>{text}</CharMorphText> : text}
    </span>
  );
}

function EmptyCanvasIllustration({
  state,
  copyingSince,
  leaving,
  isCaptionHidden,
}: {
  state: Illustrated;
  copyingSince: number | undefined;
  leaving: boolean;
  isCaptionHidden: boolean;
}) {
  const long = useLongCopy(copyingSince);
  const fade: CSSProperties = { width: '100%', opacity: leaving || isCaptionHidden ? 0 : 1, transition: morph(['opacity']) };
  const entrance = useEntrance();
  const { title, body } = caption(state, long);
  return (
    <Stack
      align="center"
      gap={5}
      data-testid="canvas-empty"
      data-empty-motion
      data-empty-leaving={leaving || undefined}
      style={{ width: '100%', ...(entrance === 'quiet' ? { animation: 'empty-quiet 200ms ease-out both' } : {}) }}
    >
      <Art kind={state.kind} entrance={entrance} leaving={leaving} />
      <Stack
        align="center"
        gap={1}
        aria-hidden={isCaptionHidden || undefined}
        style={{
          width: '100%',
          paddingInline: 'var(--spacing-4)',
          boxSizing: 'border-box',
          minHeight: 44,
          ...(isCaptionHidden ? { pointerEvents: 'none' as const } : {}),
          ...(entrance === 'full'
            ? { animation: `empty-enter 360ms cubic-bezier(.2,.8,.2,1) ${String(ENTRANCE_DELAY_MS + 60)}ms both` }
            : {}),
        }}
      >
        <Text type="body" weight="medium" color="secondary" display="block" style={fade}>
          <CaptionLine text={title} />
        </Text>
        <Text type="body" weight="normal" display="block" style={{ ...fade, color: 'var(--color-text-disabled)' }}>
          <CaptionLine text={body} />
        </Text>
      </Stack>
    </Stack>
  );
}

const sameState = (a: EmptyCanvasState, b: EmptyCanvasState): boolean =>
  a.kind === b.kind &&
  (a.kind !== 'copying' || (b.kind === 'copying' && a.repo === b.repo)) &&
  (a.kind !== 'failed' || (b.kind === 'failed' && a.stage === b.stage));

/** Fades the art out on a hide instead of dropping it; while leaving it keeps its last state and copy clock. */
export const EmptyCanvasSlot = memo(function EmptyCanvasSlot({
  state,
  copyStartedAt,
  shown,
  isCaptionHidden = false,
  onPick,
}: {
  state: EmptyCanvasState;
  copyStartedAt: number | undefined;
  shown: boolean;
  /** The art stays and the caption's space is held, so nothing moves when it fades back (ONL-2960). */
  isCaptionHidden?: boolean;
  onPick?: (kind: IdeaKind) => Promise<boolean>;
}) {
  const [held, setHeld] = useState({ state, since: copyStartedAt });
  const changed = held.since !== copyStartedAt || !sameState(held.state, state);
  if (shown && changed) setHeld({ state, since: copyStartedAt });
  const presence = usePresence(shown);
  const [areIdeasOut, setIdeasOut] = useState(false);
  const [isLeaving, setLeaving] = useState(false);
  if (!presence.present || held.state.kind === 'unknown') return null;
  if (held.state.kind === 'ideas' || held.state.kind === 'quiet') {
    return (
      <div data-testid="canvas-ideas" data-empty-leaving={!presence.visible || undefined} style={{ opacity: presence.visible ? 1 : 0, transition: morph(['opacity']) }}>
        <FollowsCanvas isAnchored={areIdeasOut} isHeld={isLeaving}>
          <ReadyCanvas quiet={held.state.kind === 'quiet'} onPick={onPick} onOpenChange={setIdeasOut} onLeavingChange={setLeaving} />
        </FollowsCanvas>
      </div>
    );
  }
  return <EmptyCanvasIllustration state={held.state} copyingSince={held.since} leaving={!presence.visible} isCaptionHidden={isCaptionHidden} />;
});
