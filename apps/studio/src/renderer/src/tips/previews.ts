import { t } from '@studio/i18n';
import type { PromptId } from './content.js';
import { LAYER } from '../overlay/layers.js';

export const LOOP_MS = 4800;
/** At rest a tile shows its finished result; hover blends to the before state just ahead of the motion and plays into it. */
export const RESULT_MS = LOOP_MS * 0.65;
export const BEFORE_MS = LOOP_MS * 0.24;

const BODIES = {
  landing: '<div class="body"><div class="copy"><i></i><i></i><i></i><i></i></div><div class="img"></div></div>',
  pricing: '<div class="lay pricing"><i></i><i class="hot"></i><i></i></div>',
  blog: '<div class="lay blog"><p><i class="th"></i><span><i></i><i></i></span></p><p><i class="th"></i><span><i></i><i></i></span></p><p><i class="th"></i><span><i></i><i></i></span></p></div>',
  dash: '<div class="lay dash"><i class="sb"></i><div><i></i><i></i><i></i><i class="wide"></i></div></div>',
  signin: '<div class="lay signin"><div><i class="h"></i><i></i><i></i><i class="go"></i></div></div>',
  gallery: '<div class="lay gallery"><i></i><i></i><i></i><i></i><i></i><i></i></div>',
  heroCenter: '<div class="lay hc"><i class="t1"></i><i class="t2"></i><i class="btn"></i><i class="img"></i></div>',
  heroBleed: '<div class="lay hb"><div><i class="t1"></i><i class="t2"></i><i class="btn"></i></div></div>',
  empty: '<div class="lay blank"><i class="ic"></i><i class="t"></i><i class="b"></i></div>',
  error: '<div class="lay error"><i class="banner"></i><i></i><i></i><i class="short"></i></div>',
  form: '<div class="lay signin"><div><i class="h"></i><i></i><i></i><i></i><i class="go"></i></div></div>',
  success: '<div class="lay blank ok"><i class="ic"></i><i class="t"></i><i class="b"></i></div>',
  article: '<div class="lay article"><i class="hero"></i><i></i><i></i><i class="short"></i></div>',
} as const;
type Body = keyof typeof BODIES;

const web = (cls = '', extra = '', layout: Body = 'landing'): string =>
  `<div class="web ${cls}"><span class="addr"></span><div class="pg"><div class="nav"><i class="logo"></i><i></i><i></i><i class="cta"></i></div>${BODIES[layout]}</div>${extra}</div>`;
const sel = (size = ''): string =>
  `<div class="sel"><b></b><b></b><b></b><b></b>${size ? `<span class="size">${size}</span>` : ''}</div>`;
const demo = (kind: string, inner: string): string => `<div class="demo d-${kind}"><div class="canvas">${inner}</div></div>`;
const refStage = (kind: string, imgBody: string, beforeLayout: Body, afterBody: string): string =>
  demo(
    kind,
    `<div class="refimg"><span class="chip">${t('tips.preview.image')}</span>${imgBody}</div>` +
      `<div class="web tgt">${web('', '', beforeLayout).replace(/^<div class="web ">|<\/div>$/g, '')}<div class="pg after"><div class="nav"><i class="logo"></i><i></i><i></i><i class="cta"></i></div>${afterBody}</div><div class="shim"></div>${sel()}</div>`,
  );
const cardx = (cls = '', extra = ''): string =>
  `<div class="cardx ${cls}"><u></u><div class="cx"><s></s><s class="sh"></s><em></em></div>${extra}</div>`;

/** Static, string-only markup: the previews are illustrations, so no user data ever reaches them. */
export const STAGES: Record<PromptId, () => string> = {
  text: () => demo('text', `${web()}<div class="new-text pop">${t('tips.preview.checkout')}${sel()}</div>`),
  routes: () =>
    demo('routes', web('home') + (['pricing', 'blog', 'dash', 'signin', 'gallery'] as const).map((l) => web('r', '', l)).join('')),
  vars: () => demo('vars', web('orig') + web('v1 pop', sel(), 'heroCenter') + web('v2 pop', sel(), 'heroBleed')),
  page: () =>
    demo(
      'page',
      `<div class="panel"><b class="proj"></b><hr><div class="ph"><span>${t('tips.preview.pages')}</span><span>+</span></div><div class="prow p1">${t('tips.preview.home')}</div><div class="prow p2 pop">${t('tips.preview.checkout')}</div><hr><div class="ph"><span>${t('tips.preview.designs')}</span></div><div class="drows d1"><i><u></u><s style="width:38%"></s></i><i><u></u><s style="width:28%"></s></i></div><div class="drows d2"><i><u></u><s style="width:30%"></s></i><i><u></u><s style="width:44%"></s></i></div></div><div class="cv cv1">${web('', '', 'landing')}${web('', '', 'blog')}</div><div class="cv cv2">${web('', '', 'pricing')}${web('', '', 'signin')}</div>`,
    ),
  ds: () =>
    demo(
      'ds',
      web('app') +
        `<div class="web sys pop"><span class="addr"></span><div class="pg"><div class="sw"><i></i><i></i><i></i><i></i><i></i></div><div class="type"><b>Aa</b><span><i></i><i></i></span></div><div class="ctl"><i class="p"></i><i></i><i class="f"></i></div></div>${sel()}</div>`,
    ),
  compare: () => demo('compare', web() + web('', sel('1440 × 900'))),
  mobile: () => demo('mobile', web() + web('phone pop', sel('390 × 844'))),
  tidy: () =>
    demo(
      'tidy',
      (
        [
          [t('tips.preview.home'), 'landing'],
          [t('tips.preview.pricing'), 'pricing'],
          [t('tips.preview.blog'), 'blog'],
          [t('tips.preview.signIn'), 'signin'],
        ] as const
      )
        .map(([name, l]) => web('', `<span class="lbl">${name}</span>`, l))
        .join(''),
    ),
  ref: () => refStage('ref', BODIES.heroCenter, 'landing', BODIES.heroCenter),
  refLayout: () => refStage('ref d-lay2', BODIES.dash, 'landing', BODIES.dash),
  refColor: () => refStage('ref d-col', '<div class="photo"><i></i><i></i><i></i></div>', 'landing', BODIES.landing),
  empty: () => demo('empty', web('full', '', 'dash') + web('emp pop', '', 'empty') + web('err pop', '', 'error')),
  flow: () =>
    demo(
      'flow',
      (
        [
          ['form', t('tips.preview.signUp')],
          ['signin', t('tips.preview.verify')],
          ['pricing', t('tips.preview.plan')],
          ['success', t('tips.preview.done')],
        ] as const
      )
        .map(([l, n], i) => web(`st${i}${i ? ' pop' : ''}`, `<span class="lbl">${n}</span>`, l))
        .join(''),
    ),
  harmonize: () => {
    const slot = (before: string): string => `<div class="slot">${cardx(before + ' before')}${cardx('after')}<span class="pickbox"></span></div>`;
    return demo(
      'hz',
      `<div class="web pagehz"><div class="pg"><div class="nav"><i class="logo"></i><i></i><i></i><i class="cta"></i></div><div class="pair">${slot('a1')}${slot('b1')}</div></div></div>`,
    );
  },
  states: () =>
    demo(
      'states',
      web('src', '', 'signin').replace('<i class="go"></i>', '<i class="go"><span class="pickbox"></span></i>') +
        `<div class="web st pop"><div class="pg"><b></b><div class="sg">${['', 'hover', 'press', 'focus', 'off', 'load'].map((k) => `<div class="state"><i class="sb ${k}">${k === 'load' ? '<em></em>' : ''}</i><s></s></div>`).join('')}</div></div>${sel()}</div>`,
    ),
  showcase: () =>
    demo(
      'show',
      web('src').replace('<div class="img"></div>', cardx('picked', '<span class="pickbox"></span>')) +
        `<div class="web sc pop"><div class="pg"><b></b><div class="vg">${cardx('v')}${cardx('v tall')}${cardx('v horiz')}${cardx('v bare')}</div></div>${sel()}</div>`,
    ),
};

export const PREVIEW_CLASS = 'tips-tile';
export const PREVIEW_HREF = 'studio-tips-previews';
// Plain CSS, not StyleX: the previews are a self-contained illustration language of nested selectors, container units and keyframes.
export const PREVIEW_RULES = `.tips-tile {
  --surface: #1f1f1f; --line: rgba(255,255,255,.08); --line-strong: rgba(255,255,255,.12);
  --ink: #ffffff; --ink-2: #acacac; --ink-3: #929292; --accent: color(display-p3 0 0.8706 0.7294);
  --ease: cubic-bezier(.22, 1, .36, 1);

  & { position: relative; aspect-ratio: 16 / 10; border-radius: 8px; overflow: hidden;
    background: linear-gradient(160deg, #0a0a0a, #151515); border: 1px solid var(--line);
    transition: transform .3s var(--ease), box-shadow .3s var(--ease); }
  /* demo stage — same vocabulary as the toolbar tool previews */
  .demo { position: absolute; inset: 0; container-type: size; --surface-i: #2a2a2a; --ink-s: rgba(255,255,255,.11); --ink-i: rgba(255,255,255,.15); }
  .canvas { position: absolute; inset: 0; }
  .web { position: absolute; }
  .web .addr { display: none; position: absolute; left: 50%; top: -4.5cqw; translate: -50% 0; width: 46%; height: 2cqw; border-radius: 2cqw; background: var(--ink-i); }
  .web .pg { position: absolute; inset: 0; background: var(--surface-i); border: 1px solid var(--ink-s); border-radius: 2px; overflow: hidden;
    padding: 7% 8%; display: flex; flex-direction: column; gap: 9%; box-shadow: 0 6px 18px rgba(0,0,0,.25); }
  .web .nav { display: flex; align-items: center; gap: 4%; height: 14%; flex: none; width: calc(100% + 19.04% + 2px); margin: calc(-8.33% - 1px) calc(-9.52% - 1px) 0; padding: 0 5%; }
  .web .nav i { height: 22%; width: 10%; border-radius: 9px; background: var(--ink-s); }
  .web .nav i.logo { height: 44%; aspect-ratio: 1; width: auto; border-radius: 50%; margin-right: auto; }
  .web .nav i.cta { height: 40%; width: 16%; }
  .web .body { flex: 1; display: flex; gap: 8%; min-height: 0; }
  .web .copy { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 7%; }
  .web .copy i { height: 9%; border-radius: 2px; background: var(--ink-s); }
  .web .copy i:nth-child(1) { width: 92% } .web .copy i:nth-child(2) { width: 64% }
  .web .copy i:nth-child(3) { width: 80%; height: 4%; margin-top: 4% } .web .copy i:nth-child(4) { width: 34%; height: 12%; border-radius: 9px; margin-top: 4% }
  .web .img { width: 40%; border-radius: 3px; background: linear-gradient(180deg, #4a4a4a, #343434 55%, #2a2a2a); }
  .web .lay { flex: 1; min-height: 0; display: flex; gap: 6%; }
  .web .lay i, .web .lay p i { display: block; border-radius: 2px; background: var(--ink-s); }
  .lay.pricing i { flex: 1; } .lay.pricing i.hot { background: var(--ink-i); transform: scaleY(1.08); }
  .lay.blog { flex-direction: column; gap: 10%; } .lay.blog p { margin: 0; flex: 1; display: flex; gap: 6%; }
  .lay.blog .th { width: 30%; background: linear-gradient(180deg, #4a4a4a, #343434); }
  .lay.blog span { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 18%; }
  .lay.blog span i { height: 22%; } .lay.blog span i + i { width: 60%; }
  .lay.dash .sb { width: 18%; } .lay.dash > div { flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8%; }
  .lay.dash > div i.wide { grid-column: 1 / -1; background: linear-gradient(180deg, #3e3e3e, #2e2e2e); }
  .lay.signin { justify-content: center; } .lay.signin > div { width: 46%; display: flex; flex-direction: column; justify-content: center; gap: 9%; }
  .lay.signin i { height: 13%; border: 1px solid var(--ink-i); background: none; } .lay.signin i.h { height: 9%; width: 60%; border: 0; background: var(--ink-i); margin: 0 auto 4%; }
  .lay.signin i.go { border: 0; background: var(--ink-i); }
  .lay.gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6%; } .lay.gallery i { background: linear-gradient(180deg, #4a4a4a, #343434); }
  .lay.article { flex-direction: column; gap: 7%; padding: 0 10%; } .lay.article i { height: 6%; } .lay.article i.hero { height: auto; flex: 1; background: linear-gradient(180deg, #4a4a4a, #343434); }
  .lay.article i.short { width: 55%; }
  .web.phone .body { flex-direction: column; } .web.phone .img { width: 100%; flex: 1; } .web.phone .copy { flex: none; height: 34%; }

  .sel { position: absolute; inset: -2px; border: 1px solid var(--accent); pointer-events: none; }
  .sel b { position: absolute; width: 5px; height: 5px; background: #fff; border: 1px solid var(--accent); transform: scale(0);
    animation: tips-handle var(--loop) cubic-bezier(.3,1.4,.5,1) infinite; }
  .sel b:nth-child(1) { left: -3px; top: -3px } .sel b:nth-child(2) { right: -3px; top: -3px }
  .sel b:nth-child(3) { left: -3px; bottom: -3px } .sel b:nth-child(4) { right: -3px; bottom: -3px }
  .size { position: absolute; left: 50%; top: calc(100% + 5px); translate: -50% 0; padding: 2px 5px; border-radius: 3px;
    background: var(--accent); color: #000; font-size: clamp(7px, 3cqw, 12px); line-height: 1.1; white-space: nowrap; font-variant-numeric: tabular-nums; }

  .pop { opacity: 0; animation: tips-pop var(--loop) var(--ease) infinite; }

  /* add text */
  .d-text .web { left: 24%; top: 36%; width: 52%; height: 52%; }
  .d-text .new-text { position: absolute; left: 24%; top: 17%; font-weight: 600; font-size: max(10px, 6cqw); color: var(--ink); letter-spacing: -.02em; line-height: 1; padding: 1px 2px; }

  /* see all routes */
  .d-routes .web { width: 22%; height: 27%; }
  .d-routes .home { left: 10%; top: 16%; }
  .d-routes .r { opacity: 0; animation: tips-route var(--loop) var(--ease) infinite; }
  .d-routes .r:nth-of-type(2) { left: 39%; top: 16% } .d-routes .r:nth-of-type(3) { left: 68%; top: 16%; animation-delay: .08s }
  .d-routes .r:nth-of-type(4) { left: 10%; top: 60%; animation-delay: .16s } .d-routes .r:nth-of-type(5) { left: 39%; top: 60%; animation-delay: .24s }
  .d-routes .r:nth-of-type(6) { left: 68%; top: 60%; animation-delay: .32s }

  /* variations — one original, two hero takes stacked beside it */
  .d-vars .web { width: 38%; height: 30%; }
  .d-vars .orig { left: 6%; top: 34%; }
  .d-vars .v1 { left: 56%; top: 13%; } .d-vars .v2 { left: 56%; top: 57%; animation-delay: .1s; }
  .lay.hc { flex-direction: column; align-items: center; gap: 6%; }
  .lay.hc i.t1 { width: 62%; height: 10%; background: var(--ink-i); } .lay.hc i.t2 { width: 40%; height: 6%; }
  .lay.hc i.btn { width: 20%; height: 10%; border-radius: 9px; background: var(--accent); }
  .lay.hc i.img { width: 100%; flex: 1; background: linear-gradient(180deg, #2f5d57, #1f3d39); }
  .lay.hb { margin: 0 -8% -7%; background: linear-gradient(120deg, #5a4a32, #2a2420); display: flex; align-items: center; padding: 0 8%; border-radius: 0; }
  .lay.hb > div { width: 52%; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 9%; }
  .lay.hb i { height: 8%; } .lay.hb i.t1 { background: rgba(255,255,255,.55); height: 12%; } .lay.hb i.t2 { width: 70%; background: rgba(255,255,255,.25); }
  .lay.hb i.btn { width: 30%; height: 11%; border-radius: 9px; background: #fff; }

  /* new page — the Pages panel gains a page and the canvas switches to it */
  .d-page .panel { font-size: clamp(6px, 2.5cqw, 11px); color: var(--ink-2); line-height: 1.3; }
  .d-page .panel { position: absolute; left: 0; top: 0; bottom: 0; width: 32%; background: #0b0b0b; border-right: 1px solid var(--line); padding: 6% 0; }
  .d-page .panel hr { border: 0; border-top: 1px solid var(--line); margin: 6% 0; }
  .d-page .proj { display: block; margin: 0 9%; width: 36%; height: max(4px, 1.6cqw); border-radius: 2px; background: var(--ink-i); }
  .d-page .ph { display: flex; justify-content: space-between; padding: 0 9% 4%; color: var(--ink); font-weight: 500; }
  .d-page .prow { margin: 0 5% 2%; padding: 4% 4%; border-radius: 3px; color: var(--ink); }
  .d-page .p1 { animation: tips-pOff var(--loop) var(--ease) infinite; }
  .d-page .p2 { background: #262626; }
  .d-page .drows { position: absolute; left: 0; right: 0; padding: 0 5%; }
  .d-page .drows i { display: flex; align-items: center; gap: 6%; padding: 3% 4%; font-style: normal; }
  .d-page .drows s { display: block; height: max(4px, 1.6cqw); border-radius: 2px; background: var(--ink-i); }
  .d-page .drows u { width: 9%; aspect-ratio: 4 / 3; border-radius: 2px; background: var(--ink-i); }
  .d-page .d1 { animation: tips-outFade var(--loop) var(--ease) infinite; opacity: 0; }
  .d-page .d2 { animation: tips-inFade var(--loop) var(--ease) infinite; }
  .d-page .cv { position: absolute; left: 32%; right: 0; top: 0; bottom: 0; }
  .d-page .cv .web { top: 30%; width: 38%; height: 40%; }
  .d-page .cv .web:nth-of-type(1) { left: 8% } .d-page .cv .web:nth-of-type(2) { left: 54% }
  .d-page .cv1 { opacity: 0; animation: tips-outFade var(--loop) var(--ease) infinite; }
  .d-page .cv2 { animation: tips-inFade var(--loop) var(--ease) infinite; }

  /* design system */
  .d-ds .web { top: 26%; width: 40%; height: 52%; }
  .d-ds .app { left: 6%; }
  .d-ds .sys { left: 54%; }
  .d-ds .sys .pg { gap: 10%; justify-content: center; }
  .d-ds .sw { display: flex; gap: 5%; height: 18%; }
  .d-ds .sw i { flex: 1; border-radius: 2px; opacity: 0; animation: tips-swatch var(--loop) var(--ease) infinite; }
  .d-ds .sw i:nth-child(1) { background: var(--accent) } .d-ds .sw i:nth-child(2) { background: #4a4a4a; animation-delay: .05s }
  .d-ds .sw i:nth-child(3) { background: #6b6b6b; animation-delay: .1s } .d-ds .sw i:nth-child(4) { background: #9a9a9a; animation-delay: .15s }
  .d-ds .sw i:nth-child(5) { background: #e6e6e6; animation-delay: .2s }
  .d-ds .type { display: flex; align-items: center; gap: 8%; height: 22%; }
  .d-ds .type b { font-size: max(8px, 5cqw); font-weight: 600; color: var(--ink); line-height: 1; }
  .d-ds .type span { flex: 1; display: flex; flex-direction: column; gap: 18%; }
  .d-ds .type span i { height: 3px; border-radius: 2px; background: var(--ink-s); } .d-ds .type span i + i { width: 60% }
  .d-ds .ctl { display: flex; gap: 5%; height: 14%; }
  .d-ds .ctl i { width: 26%; border-radius: 9px; border: 1px solid var(--ink-i); }
  .d-ds .ctl i.p { background: var(--accent); border-color: transparent; } .d-ds .ctl i.f { flex: 1; border-radius: 2px; }

  /* side by side */
  .d-compare .web { top: 28%; width: 38%; height: 48%; }
  .d-compare .web:nth-child(1) { left: 31%; animation: tips-slideL var(--loop) var(--ease) infinite; }
  .d-compare .web:nth-child(2) { left: 31%; opacity: 0; animation: tips-slideR var(--loop) var(--ease) infinite; }

  /* match a screenshot — a pasted image, and the page reshaping to match it */
  .d-ref .refimg { position: absolute; left: 6%; top: 24%; width: 36%; height: 52%; border-radius: 0; background: #d9d9d6; padding: 7% 5%;
    display: flex; flex-direction: column; box-shadow: 0 6px 18px rgba(0,0,0,.3); }
  .d-ref .refimg .chip { position: absolute; left: 0; top: -12%; font-size: clamp(6px, 2.4cqw, 11px); font-weight: 600; letter-spacing: .04em; color: var(--ink-2); }
  .d-ref .refimg .lay { flex: 1; display: flex; min-height: 0; } .d-ref .refimg .lay i { display: block; border-radius: 2px; }
  .d-ref .refimg .lay.hc i { background: #b5b5b0; } .d-ref .refimg .lay.hc i.t1 { background: #8e8e89; }
  .d-ref .refimg .lay.hc i.btn { background: #3a3a3a; } .d-ref .refimg .lay.hc i.img { background: linear-gradient(180deg, #a9a9a4, #c4c4bf); }
  .d-ref .tgt { left: 52%; top: 24%; width: 42%; height: 52%; }
  .d-ref .tgt .pg.after { position: absolute; inset: 0; animation: tips-refIn var(--loop) var(--ease) infinite; }
  .d-ref .tgt .pg.after .lay.hc i.btn { background: rgba(255,255,255,.45); } .d-ref .tgt .pg.after .lay.hc i.img { background: linear-gradient(180deg, #4a4a4a, #343434); }
  .d-ref .tgt .sel b { animation: none; transform: none; }
  .d-ref .tgt .shim { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: ${LAYER.raised}; }
  .d-ref .tgt .shim::after { content: ''; position: absolute; top: 0; bottom: 0; width: 60%; left: -60%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent); animation: tips-shimmer var(--loop) ease-in-out infinite; }
  .d-ref:not(.d-lay2):not(.d-col) .tgt .pg.after { background: #d9d9d6; border-color: transparent; }
  .d-ref:not(.d-lay2):not(.d-col) .tgt .pg.after .nav i { background: #b5b5b0; }
  .d-ref:not(.d-lay2):not(.d-col) .tgt .pg.after .lay.hc i { background: #b5b5b0; }
  .d-ref:not(.d-lay2):not(.d-col) .tgt .pg.after .lay.hc i.t1 { background: #8e8e89; }
  .d-ref:not(.d-lay2):not(.d-col) .tgt .pg.after .lay.hc i.btn { background: #3a3a3a; }
  .d-ref:not(.d-lay2):not(.d-col) .tgt .pg.after .lay.hc i.img { background: linear-gradient(180deg, #a9a9a4, #c4c4bf); }

  /* copy a layout — the image shows a dashboard, the page becomes one */
  .d-lay2 .refimg .lay.dash .sb, .d-lay2 .refimg .lay.dash > div i { background: #b5b5b0; }
  .d-lay2 .refimg .lay.dash > div { flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8%; }
  .d-lay2 .refimg .lay.dash .sb { width: 18%; } .d-lay2 .refimg .lay.dash > div i.wide { grid-column: 1 / -1; background: #c9c9c4; }
  .d-lay2 .refimg .lay { gap: 6%; }
  /* use an image's colors — a warm photo, the page picks up its palette */
  .d-col .refimg { padding: 0; background: linear-gradient(160deg, #f2b46b 0%, #d9653b 45%, #6b2c3a 100%); }
  .d-col .refimg .photo { position: absolute; inset: 0; overflow: hidden; }
  .d-col .refimg .photo i { position: absolute; border-radius: 50%; display: block; }
  .d-col .refimg .photo i:nth-child(1) { width: 34%; aspect-ratio: 1; left: 56%; top: 14%; background: #ffd9a0; opacity: .9; }
  .d-col .refimg .photo i:nth-child(2) { width: 120%; height: 50%; left: -10%; top: 62%; background: #3f1d2b; border-radius: 50% 50% 0 0; }
  .d-col .refimg .photo i:nth-child(3) { width: 70%; height: 40%; left: 40%; top: 70%; background: #5a2633; border-radius: 50% 50% 0 0; }
  .d-col .refimg .chip { color: var(--ink-2); }
  .d-col .tgt .pg.after .nav i.cta, .d-col .tgt .pg.after .copy i:nth-child(4) { background: #e0743f; }
  .d-col .tgt .pg.after .img { background: linear-gradient(160deg, #f2b46b, #d9653b 50%, #6b2c3a); }
  .d-col .tgt .pg.after .copy i:nth-child(1) { background: rgba(242,180,107,.5); }
  /* empty and error — one page becomes three */
  .d-empty .web { top: 30%; width: 28%; height: 40%; }
  .d-empty .full { left: 5%; }
  .d-empty .emp { left: 36%; } .d-empty .err { left: 67%; animation-delay: .1s; }
  .lay.blank { flex-direction: column; align-items: center; justify-content: center; gap: 9%; }
  .lay.blank i.ic { width: 18%; aspect-ratio: 1; border-radius: 50%; border: 1px dashed var(--ink-i); background: none; }
  .lay.blank i.t { width: 46%; height: 7%; } .lay.blank i.b { width: 28%; height: 11%; border-radius: 9px; background: var(--ink-i); }
  .lay.blank.ok i.ic { border: 0; background: var(--accent); opacity: .8; }
  .lay.error { flex-direction: column; gap: 9%; } .lay.error i { height: 7%; }
  .lay.error i.banner { height: 18%; background: rgba(255,90,90,.35); border: 1px solid rgba(255,110,110,.6); } .lay.error i.short { width: 50%; }

  /* walk a flow — steps appear left to right */
  .d-flow .web { top: 36%; width: 19%; height: 32%; }
  .d-flow .st0 { left: 4% } .d-flow .st1 { left: 28%; } .d-flow .st2 { left: 52%; animation-delay: .12s } .d-flow .st3 { left: 76%; animation-delay: .24s }
  .d-flow .lbl { position: absolute; left: 0; bottom: calc(100% + clamp(4px, 1.4cqw, 10px)); font-size: clamp(7px, 2.6cqw, 12px); font-weight: 500; color: var(--ink-2); white-space: nowrap; }
  .d-flow .arrow { position: absolute; right: calc(100% + 1px); top: 50%; width: 22%; height: 1px; background: var(--ink-3); }
  .d-flow .arrow::after { content: ''; position: absolute; right: 0; top: -2px; border: 2.5px solid transparent; border-left: 4px solid var(--ink-3); border-right: 0; }

  /* harmonize — two picked elements that differ, brought into one style */
  .d-hz .pagehz { left: 18%; top: 12%; width: 64%; height: 76%; }
  .d-hz .pair { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10%; padding: 2% 6%; min-height: 0; }
  .d-hz .slot { position: relative; }
  .d-hz .slot .cardx { position: absolute; inset: 0; }
  .d-hz .pickbox { position: absolute; inset: -3px; border: 1px solid color(display-p3 0.98 0 0.229); }
  .d-hz .before { opacity: 0; animation: tips-hzOut var(--loop) var(--ease) infinite; }
  .d-hz .after { animation: tips-hzIn var(--loop) var(--ease) infinite; }
  .d-hz .a1 { border-radius: 8px; } .d-hz .a1 u { flex: 1.6; border-radius: 7px 7px 0 0; } .d-hz .a1 em { background: var(--accent); width: 60%; }
  .d-hz .b1 { inset: 12% 0 !important; border-radius: 0; background: #3a3a3a; flex-direction: row; }
  .d-hz .b1 u { flex: none; width: 40%; border-radius: 0; } .d-hz .b1 em { background: none; border: 1px solid rgba(255,255,255,.35); border-radius: 0; }
  .d-hz .b1 .cx { padding: 6%; }

  /* states — a picked button laid out in each of its states */
  .d-states .src { left: 5%; top: 24%; width: 44%; height: 52%; }
  .d-states .lay.signin i.go { position: relative; }
  .d-states .pickbox { position: absolute; inset: -2px; border: 1px solid color(display-p3 0.98 0 0.229); animation: tips-pick var(--loop) var(--ease) infinite; }
  .d-states .st { left: 55%; top: 12%; width: 40%; height: 76%; }
  .d-states .st .pg { gap: 6%; }
  .d-states .st .pg > b { height: 4%; width: 40%; border-radius: 2px; background: var(--ink-i); }
  .d-states .sg { flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; gap: 6%; min-height: 0; }
  .d-states .state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14%; border: 1px dashed var(--ink-s); border-radius: 3px;
    opacity: 0; animation: tips-swatch var(--loop) var(--ease) infinite; }
  .d-states .state s { width: 40%; height: 5%; min-height: 2px; border-radius: 2px; background: var(--ink-s); }
  .d-states .sb { position: relative; width: 64%; height: 32%; border-radius: 3px; background: #5a5a5a; display: flex; align-items: center; justify-content: center; gap: 6%; }
  .d-states .sb.hover { background: #7a7a7a; } .d-states .sb.press { background: #444; transform: scale(.94); }
  .d-states .sb.focus { box-shadow: 0 0 0 1.5px #1b1b1b, 0 0 0 2.5px var(--accent); } .d-states .sb.off { opacity: .35; }
  .d-states .sb em { height: 40%; min-height: 0; flex: none; aspect-ratio: 1; box-sizing: border-box; border-radius: 50%; border: 1px solid rgba(255,255,255,.25); border-top-color: rgba(255,255,255,.85); transform: rotate(40deg); }
  .d-states .state:nth-child(2) { animation-delay: .05s } .d-states .state:nth-child(3) { animation-delay: .1s }
  .d-states .state:nth-child(4) { animation-delay: .15s } .d-states .state:nth-child(5) { animation-delay: .2s } .d-states .state:nth-child(6) { animation-delay: .25s }

  /* showcase — a picked card gets a page of its own variants */
  .d-show .src { left: 5%; top: 26%; width: 44%; height: 48%; }
  .d-show .pickbox { position: absolute; inset: -2px; border: 1px solid color(display-p3 0.98 0 0.229); border-radius: 0; animation: tips-pick var(--loop) var(--ease) infinite; }
  .cardx { position: relative; display: flex; flex-direction: column; border: 1px solid var(--ink-i); border-radius: 3px; background: #313131; overflow: visible; }
  .cardx u { flex: 1.1; border-radius: 2px 2px 0 0; background: linear-gradient(180deg, #4a4a4a, #383838); }
  .cardx .cx { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 12%; padding: 8% 10%; }
  .cardx s { height: 12%; min-height: 2px; width: 80%; border-radius: 2px; background: var(--ink-i); } .cardx s.sh { width: 55%; background: var(--ink-s); }
  .cardx em { height: 18%; min-height: 3px; width: 42%; border-radius: 9px; background: rgba(255,255,255,.28); }
  .d-show .src .cardx.picked { width: 38%; }
  .d-show .sc { left: 55%; top: 12%; width: 40%; height: 76%; }
  .d-show .sc .pg { gap: 6%; }
  .d-show .sc .pg > b { height: 4%; width: 40%; border-radius: 2px; background: var(--ink-i); }
  .d-show .vg { flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1.4fr 1fr; gap: 7%; min-height: 0; }
  .d-show .v { opacity: 0; animation: tips-swatch var(--loop) var(--ease) infinite; }
  .d-show .v.tall u { flex: 2; } .d-show .v.tall em { background: var(--accent); }
  .d-show .v.horiz { flex-direction: row; } .d-show .v.horiz u { flex: none; width: 38%; border-radius: 2px 0 0 2px; }
  .d-show .v.bare u { display: none; } .d-show .v.bare em { background: none; border: 1px solid rgba(255,255,255,.3); }
  .d-show .v:nth-child(2) { animation-delay: .06s } .d-show .v:nth-child(3) { animation-delay: .12s } .d-show .v:nth-child(4) { animation-delay: .18s }

  /* mobile */
  .d-mobile .web { left: 8%; top: 26%; width: 54%; height: 52%; }
  .d-mobile .web.phone { left: 70%; top: 16%; width: 18%; height: 68%; }

  /* tidy */
  .d-tidy .web { width: 22%; height: 27%; left: var(--x0); top: var(--y0); animation: tips-tidy var(--loop) var(--ease) infinite; }
  .d-tidy .web:nth-child(1) { --x0: 12%; --y0: 50%; --x1: 10%; --y1: 16%; }
  .d-tidy .web:nth-child(2) { --x0: 44%; --y0: 12%; --x1: 39%; --y1: 16%; }
  .d-tidy .web:nth-child(3) { --x0: 66%; --y0: 54%; --x1: 68%; --y1: 16%; }
  .d-tidy .web:nth-child(4) { --x0: 36%; --y0: 64%; --x1: 10%; --y1: 60%; }
  .d-tidy .lbl { position: absolute; left: 0; bottom: calc(100% + clamp(4px, 1.4cqw, 10px)); font-size: clamp(7px, 2.8cqw, 12px); font-weight: 500; color: var(--ink-2);
    white-space: nowrap; opacity: 0; animation: tips-lbl var(--loop) var(--ease) infinite; }
  .d-tidy .web:nth-child(2) .lbl { animation-delay: .06s } .d-tidy .web:nth-child(3) .lbl { animation-delay: .12s } .d-tidy .web:nth-child(4) .lbl { animation-delay: .18s }

  /* detail */
}
@keyframes tips-handle { 0%, 36% { transform: scale(0) } 42% { transform: scale(1.3) } 46%, 100% { transform: scale(1) } }
@keyframes tips-pop { 0%, 30% { opacity: 0; transform: translateY(6px) scale(.92) } 40%, 88% { opacity: 1; transform: none } 96%, 100% { opacity: 0 } }
@keyframes tips-route { 0%, 30% { opacity: 0; transform: scale(.6) } 42%, 88% { opacity: 1; transform: none } 96%, 100% { opacity: 0 } }
@keyframes tips-varOrig { 0%, 30% { left: 30% } 40%, 90% { left: 6% } 100% { left: 30% } }
@keyframes tips-pOff { 0%, 34% { background: #262626 } 40%, 90% { background: transparent; color: var(--ink-2) } 100% { background: #262626 } }
@keyframes tips-outFade { 0%, 36% { opacity: 1; transform: none } 42%, 92% { opacity: 0; transform: translateX(-4%) } 100% { opacity: 1; transform: none } }
@keyframes tips-inFade { 0%, 40% { opacity: 0; transform: translateX(4%) } 48%, 90% { opacity: 1; transform: none } 97%, 100% { opacity: 0 } }
@keyframes tips-dsApp { 0%, 30% { left: 30% } 40%, 90% { left: 6% } 100% { left: 30% } }
@keyframes tips-swatch { 0%, 38% { opacity: 0; transform: translateY(3px) } 46%, 88% { opacity: 1; transform: none } 96%, 100% { opacity: 0 } }
@keyframes tips-slideL { 0%, 30% { left: 31% } 40%, 90% { left: 8% } 100% { left: 31% } }
@keyframes tips-slideR { 0%, 30% { left: 31%; opacity: 0 } 40%, 88% { left: 54%; opacity: 1 } 96%, 100% { opacity: 0 } }
@keyframes tips-shimmer { 0%, 26% { transform: translateX(0) } 44%, 100% { transform: translateX(270%) } }
@keyframes tips-refIn { 0%, 34% { opacity: 0 } 38%, 92% { opacity: 1 } 100% { opacity: 0 } }
@keyframes tips-emptyFull { 0%, 30% { left: 36% } 40%, 90% { left: 5% } 100% { left: 36% } }
@keyframes tips-hzOut { 0%, 32% { opacity: 1; transform: none } 42%, 92% { opacity: 0; transform: scale(.97) } 100% { opacity: 1; transform: none } }
@keyframes tips-hzIn { 0%, 34% { opacity: 0; transform: scale(1.03) } 44%, 90% { opacity: 1; transform: none } 98%, 100% { opacity: 0 } }
@keyframes tips-pick { 0%, 20% { opacity: 0 } 26%, 92% { opacity: 1 } 100% { opacity: 0 } }
@keyframes tips-lbl { 0%, 42% { opacity: 0; transform: translateY(3px) } 50%, 88% { opacity: 1; transform: none } 96%, 100% { opacity: 0 } }
@keyframes tips-tidy { 0%, 28% { left: var(--x0); top: var(--y0) } 42%, 90% { left: var(--x1); top: var(--y1) } 100% { left: var(--x0); top: var(--y0) } }
`;
