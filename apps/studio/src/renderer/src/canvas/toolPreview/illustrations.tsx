import { useInsertionEffect, type CSSProperties, type ReactNode } from 'react';
import { charKeys } from './charKeys.js';
import { t } from '@studio/i18n';
import { ARTIFACT_ACCENT_ATTRS } from '../artifactAccent.js';
import { SECTION_FILL } from '../SectionNode.jsx';
import './toolPreview.css';

const LOOP = '3.6s';

const STAGE: CSSProperties = { position: 'relative', width: 112, height: 80, flexShrink: 0 };

const BOX: CSSProperties = {
  position: 'absolute',
  left: 8,
  top: 12,
  border: '1px solid var(--color-accent)',
  animation: `ftp-box ${LOOP} cubic-bezier(.4,0,.2,1) infinite, ftp-size ${LOOP} cubic-bezier(.4,0,.2,1) infinite`,
};

const PAGE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  background: 'var(--studio-illo-surface)',
  animation: `ftp-page ${LOOP} ease infinite`,
};

const BADGE: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: 'calc(100% + 4px)',
  transform: 'translateX(-50%)',
  padding: '2px 4px',
  borderRadius: 3,
  background: 'var(--color-accent)',
  color: 'var(--color-background-card)',
  fontSize: 8,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
  animation: `ftp-badge ${LOOP} ease infinite`,
};

const CHROME: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: -11,
  height: 7,
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  animation: `ftp-chrome ${LOOP} ease infinite`,
};

const CHROME_ADDRESS: CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 60,
  height: 6,
  borderRadius: 3,
  background: 'var(--studio-illo-ink)',
};

const ARTIFACT_HEADING: CSSProperties = {
  position: 'absolute',
  left: 10,
  top: 12,
  width: 30,
  height: 6,
  borderRadius: 1,
  background: 'var(--color-accent)',
  animation: `ftp-page ${LOOP} ease infinite`,
};

const ARTIFACT_LINE: CSSProperties = {
  position: 'absolute',
  left: 10,
  height: 4,
  borderRadius: 1,
  background: 'var(--studio-illo-ink-muted, var(--color-border))',
  animation: `ftp-page ${LOOP} ease infinite`,
};

const HANDLE: CSSProperties = {
  position: 'absolute',
  width: 5,
  height: 5,
  background: 'var(--color-on-dark)',
  border: '1px solid var(--color-accent)',
  boxSizing: 'border-box',
  animation: `ftp-handle ${LOOP} cubic-bezier(.3,1.4,.5,1) infinite`,
};


function ToolPreview({ children, kind }: { children: ReactNode; kind: string }) {
  return (
    <div style={STAGE} data-tool-illustration={kind} aria-hidden>
      {children}
    </div>
  );
}

const TONE = 'var(--studio-illo-ink-soft)';

function MiniLanding() {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '5px 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: TONE }} />
        <span style={{ marginLeft: 'auto', width: 7, height: 2, borderRadius: 1, background: TONE }} />
        <span style={{ width: 7, height: 2, borderRadius: 1, background: TONE }} />
        <span style={{ width: 10, height: 4, borderRadius: 2, background: TONE }} />
      </div>
      <div style={{ display: 'flex', gap: 5, flex: 1 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <span style={{ width: '92%', height: 4, borderRadius: 1, background: TONE }} />
          <span style={{ width: '64%', height: 4, borderRadius: 1, background: TONE }} />
          <span style={{ width: '80%', height: 1.5, marginTop: 2, borderRadius: 1, background: TONE }} />
          <span style={{ width: 16, height: 5, marginTop: 2, borderRadius: 3, background: TONE }} />
        </div>
        <div
          style={{
            width: 34,
            borderRadius: 3,
            background: TONE,
          }}
        />
      </div>
    </div>
  );
}

export function SelectPreview() {
  return (
    <ToolPreview kind="select">
      <div style={{ position: 'absolute', inset: 0, animation: `stp-fade ${LOOP} ease infinite` }}>
        <div style={{ position: 'absolute', left: 22, top: 26, width: 54, height: 34, animation: `stp-move ${LOOP} cubic-bezier(.4,0,.2,1) infinite` }}>
          <div style={{ position: 'absolute', inset: 0, border: '1px solid var(--studio-illo-ink-soft)', background: 'var(--studio-illo-surface)', overflow: 'hidden', animation: `stp-ring ${LOOP} steps(1) infinite` }}>
            <div style={{ width: 96, height: 60, transform: 'scale(0.5625)', transformOrigin: 'top left' }}>
              <MiniLanding />
            </div>
          </div>
          {(['-2px auto auto -2px', '-2px -2px auto auto', 'auto auto -2px -2px', 'auto -2px -2px auto'] as const).map((inset) => (
            <span key={inset} style={{ ...HANDLE, inset, animation: `stp-handle ${LOOP} cubic-bezier(.3,1.4,.5,1) infinite` }} />
          ))}
          <div style={{ position: 'absolute', inset: 0, animation: `stp-arrow ${LOOP} steps(1) infinite` }}>
            <Pointer
              style={{
                left: 30 - POINTER_TIP.x,
                top: 16 - POINTER_TIP.y,
                transformOrigin: `${String(POINTER_TIP.x)}px ${String(POINTER_TIP.y)}px`,
                animation: `stp-cursor ${LOOP} cubic-bezier(.4,0,.2,1) infinite`,
              }}
            />
          </div>
          <GrabCursor style={{ left: 30 - 15, top: 16 - 16, animation: `stp-grab ${LOOP} steps(1) infinite` }} />
        </div>
      </div>
    </ToolPreview>
  );
}

const PAN_ITEMS = [
  { left: 4, top: 16, width: 40, height: 26 },
  { left: 52, top: 30, width: 28, height: 36, photo: true },
  { left: 90, top: 12, width: 44, height: 28 },
  { left: 142, top: 34, width: 34, height: 22 },
];

export function PanPreview() {
  return (
    <ToolPreview kind="pan">
      <div style={{ position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', inset: 0, animation: `ptp-orbit ${LOOP} linear infinite` }}>
          {PAN_ITEMS.map(({ left, top, width, height, photo }) => (
            <div key={left} style={{ position: 'absolute', left, top, width, height, border: '1px solid var(--studio-illo-ink-soft)', background: photo ? TONE : 'var(--studio-illo-surface)', overflow: 'hidden' }}>
              {photo ? null : (
                <div style={{ width: 96, height: 60, transform: `scale(${String(width / 96)})`, transformOrigin: 'top left' }}>
                  <MiniLanding />
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', inset: 0, animation: `ptp-orbit ${LOOP} linear infinite` }}>
          <GrabCursor style={{ left: 41.5, top: 23.5 }} />
        </div>
      </div>
    </ToolPreview>
  );
}

/** Must match the `[data-tpp-pane]` head start in styles.css. */
const HEAD_START_S = 0.45;

const RUN_FRAMES = [
  { left: 2, top: 30, delay: 0 },
  { left: 40, top: 22, delay: 0.12 },
  { left: 78, top: 30, delay: 0.24 },
];

export function RunPreview({ running }: { running: boolean }) {
  return (
    <ToolPreview kind="run">
      {RUN_FRAMES.map(({ left, top, delay }) => (
        <div key={left} style={{ position: 'absolute', left, top, width: 32, height: 22 }}>
          <span style={{ position: 'absolute', left: '50%', top: -5, width: 16, height: 2.5, borderRadius: 2, transform: 'translateX(-50%)', background: TONE }} />
          <div style={{ position: 'absolute', inset: 0, border: '1px solid var(--studio-illo-ink-soft)', background: 'var(--studio-illo-surface-sunken)', overflow: 'hidden' }}>
            <div data-own-delay
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--studio-illo-surface)',
                animation: `rtp-live ${LOOP} cubic-bezier(.2,.8,.2,1) ${String(delay * 3.6 - HEAD_START_S)}s infinite ${running ? 'reverse' : 'normal'} both`,
              }}
            >
              <div style={{ width: 96, height: 66, transform: 'scale(0.333)', transformOrigin: 'top left' }}>
                <MiniLanding />
              </div>
            </div>
          </div>
        </div>
      ))}
    </ToolPreview>
  );
}

export function FrameToolPreview() {
  return (
    <ToolPreview kind="frame">
        <div style={BOX}>
          <div style={PAGE}>
            <MiniLanding />
          </div>
          <div style={CHROME}>
            <span style={CHROME_ADDRESS} />
          </div>
          {(['-3px auto auto -3px', '-3px -3px auto auto', 'auto auto -3px -3px', 'auto -3px -3px auto'] as const).map((inset) => (
            <span key={inset} style={{ ...HANDLE, inset }} />
          ))}
          <span data-ftp-badge style={BADGE} />
          <Pointer style={{ left: `calc(100% - ${String(POINTER_TIP.x - 1)}px)`, top: `calc(100% - ${String(POINTER_TIP.y - 1)}px)`, animation: `ftp-cursor ${LOOP} ease infinite`, transformOrigin: `${String(POINTER_TIP.x)}px ${String(POINTER_TIP.y)}px` }} />
        </div>
    </ToolPreview>
  );
}

/* 22, not BOX's 12: the name hangs above the box, and the tooltip clips what leaves the 80px stage (ONL-2661). */
export function SectionToolPreview() {
  return <ToolPreview kind="section">
    <div style={{ ...BOX, top: 22, borderRadius: 5, background: SECTION_FILL }}>
      <span style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, fontSize: 9, lineHeight: '11px', color: 'var(--studio-illo-ink-label)' }}>{t('canvas.section.defaultName')}</span>
      <div style={{ ...PAGE, display: 'flex', gap: 8, padding: 10, boxSizing: 'border-box' }}>
        {[0, 1].map((index) => <div key={index} style={{ position: 'relative', flex: 1, borderRadius: 3, background: 'var(--studio-illo-ink-soft)' }}><MiniLanding /></div>)}
      </div>
      {(['-3px auto auto -3px', '-3px -3px auto auto', 'auto auto -3px -3px', 'auto -3px -3px auto'] as const).map((inset) => <span key={inset} style={{ ...HANDLE, inset }} />)}
    </div>
  </ToolPreview>;
}

/** Where the arrow's tip sits inside the 22px cursor box (the artwork's 8.2,4.9 on a 28 grid). */
const POINTER_TIP = { x: (8.2 / 28) * 22, y: (4.9 / 28) * 22 };

const GRAB_PATH =
  'M12.6,13c0.5-0.2,1.4-0.1,1.7,0.5c0.2,0.5,0.4,1.2,0.4,1.1c0-0.4,0-1.2,0.1-1.6c0.1-0.3,0.3-0.6,0.7-0.7c0.3-0.1,0.6-0.1,0.9-0.1c0.3,0.1,0.6,0.3,0.8,0.5c0.4,0.6,0.4,1.9,0.4,1.8c0.1-0.3,0.1-1.2,0.3-1.6c0.1-0.2,0.5-0.4,0.7-0.5c0.3-0.1,0.7-0.1,1,0c0.2,0,0.6,0.3,0.7,0.5c0.2,0.3,0.3,1.3,0.4,1.7c0,0.1,0.1-0.4,0.3-0.7c0.4-0.6,1.8-0.8,1.9,0.6c0,0.7,0,0.6,0,1.1c0,0.5,0,0.8,0,1.2c0,0.4-0.1,1.3-0.2,1.7c-0.1,0.3-0.4,1-0.7,1.4c0,0-1.1,1.2-1.2,1.8c-0.1,0.6-0.1,0.6-0.1,1c0,0.4,0.1,0.9,0.1,0.9s-0.8,0.1-1.2,0c-0.4-0.1-0.9-0.8-1-1.1c-0.2-0.3-0.5-0.3-0.7,0c-0.2,0.4-0.7,1.1-1,1.1c-0.7,0.1-2.1,0-3.1,0c0,0,0.2-1-0.2-1.4c-0.3-0.3-0.8-0.8-1.1-1.1l-0.8-0.9c-0.3-0.4-1-0.9-1.2-2c-0.2-0.9-0.2-1.4,0-1.8c0.2-0.4,0.7-0.6,0.9-0.6c0.2,0,0.7,0,0.9,0.1c0.2,0.1,0.3,0.2,0.5,0.4c0.2,0.3,0.3,0.5,0.2,0.1c-0.1-0.3-0.3-0.6-0.4-1c-0.1-0.4-0.4-0.9-0.4-1.5C11.7,13.9,11.8,13.3,12.6,13';

function GrabCursor({ style }: { style: CSSProperties }) {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" style={{ position: 'absolute', ...style }}>
      <path fill="#FFFFFF" d={GRAB_PATH} />
      <path fill="none" stroke="#000000" strokeWidth="0.75" strokeLinejoin="round" d={`${GRAB_PATH}z`} />
      <line fill="none" stroke="#000000" strokeWidth="0.75" strokeLinecap="round" x1="19.6" y1="20.7" x2="19.6" y2="17.3" />
      <line fill="none" stroke="#000000" strokeWidth="0.75" strokeLinecap="round" x1="17.6" y1="20.7" x2="17.5" y2="17.3" />
      <line fill="none" stroke="#000000" strokeWidth="0.75" strokeLinecap="round" x1="15.6" y1="17.3" x2="15.6" y2="20.7" />
    </svg>
  );
}

function Pointer({ style }: { style: CSSProperties }) {
  return (
    <svg data-tool-pointer width="22" height="22" viewBox="0 0 28 28" style={{ position: 'absolute', ...style }}>
      <polygon fill="#FFFFFF" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6" />
      <polygon fill="#FFFFFF" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5" />
      <rect x="12.5" y="13.6" transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)" width="2" height="8" />
      <polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5" />
    </svg>
  );
}

const TYPE_START = 26;
const TYPE_END = 70;

/** Per word length: the timing depends on the translated sample. */
const typingKeyframes = (length: number): string =>
  Array.from({ length }, (_, index) => {
    const at = TYPE_START + ((TYPE_END - TYPE_START) * (index + 1)) / length;
    return `@keyframes ttp-char-${String(length)}-${String(index)} { 0% { display: none } ${at.toFixed(1)}%, 100% { display: inline } }`;
  }).join('\n');

function useTypingKeyframes(length: number): void {
  useInsertionEffect(() => {
    const id = `ttp-typing-${String(length)}`;
    if (document.getElementById(id)) return;
    const sheet = document.createElement('style');
    sheet.id = id;
    sheet.textContent = typingKeyframes(length);
    document.head.append(sheet);
  }, [length]);
}

/** Reuses the Window tool's `ftp-*` motion: both are drawn to a size (ONL-2568). */
export function ArtifactToolPreview() {
  return (
    <ToolPreview kind="artifact">
      <div {...ARTIFACT_ACCENT_ATTRS} style={{ position: 'absolute', inset: 0 }}>
        <div style={BOX}>
          <div style={PAGE}>
            <span style={ARTIFACT_HEADING} />
            <span style={{ ...ARTIFACT_LINE, top: 26, width: 46 }} />
            <span style={{ ...ARTIFACT_LINE, top: 34, width: 32 }} />
          </div>
          {(['-3px auto auto -3px', '-3px -3px auto auto', 'auto auto -3px -3px', 'auto -3px -3px auto'] as const).map(
            (inset) => (
              <span key={inset} style={{ ...HANDLE, inset }} />
            ),
          )}
          <Pointer
            style={{
              left: `calc(100% - ${String(POINTER_TIP.x - 1)}px)`,
              top: `calc(100% - ${String(POINTER_TIP.y - 1)}px)`,
              animation: `ftp-cursor ${LOOP} ease infinite`,
              transformOrigin: `${String(POINTER_TIP.x)}px ${String(POINTER_TIP.y)}px`,
            }}
          />
        </div>
      </div>
    </ToolPreview>
  );
}

export function TextToolPreview() {
  const letters = charKeys(t('canvas.tool.text.sample'));
  useTypingKeyframes(letters.length);
  return (
    <ToolPreview kind="text">
      <div style={{ position: 'absolute', inset: 0, animation: `ttp-fade ${LOOP} ease infinite` }}>
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 26,
            outline: '1px solid var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            animation: `ttp-box ${LOOP} ease infinite, ttp-ring ${LOOP} ease infinite`,
          }}
        >
          <span style={{ whiteSpace: 'pre', fontSize: 16, lineHeight: 1, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {letters.map(({ key, char }, index) => (
              <span key={key} style={{ animation: `ttp-char-${String(letters.length)}-${String(index)} ${LOOP} steps(1) infinite` }}>
                {char}
              </span>
            ))}
          </span>
          <span
            style={{
              width: 1.5,
              height: 16,
              marginLeft: 1,
              background: 'var(--color-text-primary)',
              animation: `ttp-caret ${LOOP} steps(1) infinite, ttp-blink 0.8s steps(1) infinite`,
            }}
          />
        </div>
        <Pointer style={{ left: 14 - POINTER_TIP.x, top: 26 - POINTER_TIP.y, animation: `ttp-click ${LOOP} ease infinite` }} />
      </div>
    </ToolPreview>
  );
}

const PHOTO = 'var(--studio-illo-photo-raised)';

function PhotoArt() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 112 112" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
      <circle cx="78" cy="34" r="9" style={{ fill: 'var(--studio-illo-ink)' }} />
      <path d="M0 112 L0 84 L34 56 L58 76 L76 62 L112 88 L112 112 Z" style={{ fill: 'var(--studio-illo-hairline)' }} />
    </svg>
  );
}

export function ImageToolPreview() {
  return (
    <ToolPreview kind="image">
      <div
        style={{
          position: 'absolute',
          left: 18,
          top: 10,
          width: 80,
          height: 60,
          overflow: 'hidden',
          background: PHOTO,
          animation: `itp-image ${LOOP} linear infinite`,
        }}
      >
        <PhotoArt />
        <span style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px var(--color-accent)', opacity: 0, animation: `itp-ring ${LOOP} ease infinite` }} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 38,
          top: 22,
          width: 40,
          height: 36,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          animation: `itp-file ${LOOP} cubic-bezier(.3,.7,.2,1) infinite`,
        }}
      >
        <div style={{ position: 'relative', width: 30, height: 24, borderRadius: 3, overflow: 'hidden', background: PHOTO, border: '1px solid var(--studio-illo-ink-soft)', boxShadow: '0 4px 10px var(--studio-illo-shadow)', animation: `itp-thumb ${LOOP} linear infinite` }}>
          <PhotoArt />
        </div>
        <span style={{ fontSize: 7, lineHeight: 1, color: 'var(--studio-illo-ink-label)', whiteSpace: 'nowrap' }}>
          {t('canvas.tool.image.sample')}
        </span>
        <GrabCursor style={{ left: 10.5, top: 2.5 }} />
      </div>
    </ToolPreview>
  );
}
