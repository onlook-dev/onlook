import { forwardRef, useEffect, useRef } from 'react';
import { t } from '@studio/i18n';
import { CENTRAL } from './centralIcons.js';
import { paintArt } from './paintArt.js';

import type { TourStepId } from '@studio/events';
import { LAYER } from '../overlay/layers.js';

export type TourStep = TourStepId;

/** The still the tour pans across: the editor window inset on its backdrop. */

export const SCENE_HREF = 'studio-tour-scene';
export const SCENE_RULES = `
.ts{contain:layout style;position:absolute;left:0;top:0;width:1520px;height:980px;transform-origin:0 0;overflow:visible;background:color(display-p3 0.0392 0.0392 0.0464);color:color(display-p3 1 1 1);font:13px/1.5385 var(--font-family-body);-webkit-font-smoothing:antialiased;pointer-events:none;user-select:none}
.ts *{box-sizing:border-box}
.ts svg{display:block;flex:none}
/* Backdrop layer coordinates are scene px + 400. */
.ts .bgx{position:absolute;left:-400px;top:-400px;width:2320px;height:1800px;overflow:hidden;background:linear-gradient(180deg,color(display-p3 0.0431 0.0431 0.051) 0,color(display-p3 0.0549 0.0549 0.0627) 900px,color(display-p3 0.1765 0.1765 0.1843) 1170px,color(display-p3 0.6078 0.6078 0.6039) 1250px,color(display-p3 0.8627 0.8627 0.8549) 1340px,color(display-p3 0.9255 0.9255 0.9176) 1480px,color(display-p3 0.7882 0.7882 0.7843) 1800px)}
.ts canvas.bdp{position:absolute;inset:0;width:100%;height:100%;background:none;border-radius:0;opacity:0;transition:opacity .4s}
.ts canvas.bdp[data-ready]{opacity:1}
.ts canvas.refl{position:absolute;left:40px;top:954px;width:1440px;height:330px;background:none;border-radius:0}
.ts .contact{position:absolute;left:90px;top:940px;width:1340px;height:34px;background:radial-gradient(50% 45% at 50% 40%,color(display-p3 0 0 0 / .55),transparent 85%);filter:blur(9px)}

.ts .win{position:absolute;left:40px;top:40px;width:1440px;height:900px;border-radius:18px;corner-shape:superellipse(1.5);overflow:hidden;background:linear-gradient(180deg,color(display-p3 1 1 1 / .035),color(display-p3 1 1 1 / 0) 30%),color(display-p3 0.0627 0.0627 0.0735);border:1px solid color(display-p3 1 1 1 / .16);box-shadow:inset 0 1px 0 color(display-p3 1 1 1 / .22),inset 0 -1px 0 color(display-p3 1 1 1 / .22)}
.ts .bar{position:absolute;left:0;top:0;right:0;height:36px;background:color(display-p3 0.1176 0.1176 0.132 / .55);box-shadow:inset 0 -.5px 0 color(display-p3 1 1 1 / .1)}
.ts .bar>*{position:absolute}
.ts .lights i{position:absolute;top:11.25px;width:13.5px;height:13.5px;border-radius:50%}
.ts .ib{top:4px;width:32px;height:28px;display:grid;place-items:center;color:color(display-p3 0.5725 0.5725 0.5725)}
.ts .tab{top:0;width:189px;height:36px;display:flex;align-items:center;padding:0 7px 0 13px;font-size:12px;color:color(display-p3 0.6745 0.6745 0.6745);border-right:.5px solid color(display-p3 1 1 1 / .1)}
.ts .tab.on{background:color(display-p3 1 1 1 / .13);color:color(display-p3 1 1 1);border-left:.5px solid color(display-p3 1 1 1 / .1)}
.ts .tab .nm{flex:1}
.ts .tab .x{width:24px;height:24px;display:grid;place-items:center;color:color(display-p3 1 1 1)}
.ts .newp{top:0;width:41px;height:36px;display:grid;place-items:center;color:color(display-p3 0.5725 0.5725 0.5725)}
.ts .git{top:5px;right:5px;display:flex;align-items:stretch;height:26px;border-radius:4px 13px 4px 4px;corner-shape:superellipse(1.5);background:color(display-p3 1 1 1);color:color(display-p3 0 0 0);font-size:12px;font-weight:500;line-height:1}
.ts .git .cell{display:flex;align-items:center;gap:6px;padding:0 10px 0 6px}
.ts .git .dv{align-self:center;width:.5px;height:55%;background:color(display-p3 0.5725 0.5725 0.5725)}
.ts .git .chev{display:flex;align-items:center;padding:0 6px}
.ts .surface{background:linear-gradient(180deg,color(display-p3 1 1 1 / .06),color(display-p3 1 1 1 / .04));box-shadow:inset 0 .5px 0 color(display-p3 1 1 1 / .08)}
.ts .rail{position:absolute;left:0;top:36px;bottom:0;width:60px;border-right:.5px solid color(display-p3 0.2863 0.2863 0.2863)}
.ts .rail>*{position:absolute}
.ts .rb{left:14px;width:32px;height:32px;border-radius:4px;display:grid;place-items:center;color:color(display-p3 0.5725 0.5725 0.5725)}
.ts .rb.on{background:color(display-p3 1 1 1 / .15);color:color(display-p3 1 1 1)}
.ts .rl{left:0;width:60px;text-align:center;white-space:pre;font-size:10px;line-height:12px;color:color(display-p3 0.6702 0.6856 0.7074)}
.ts .rl.on{color:color(display-p3 0.8766 0.8859 0.8968)}
.ts .rule{left:18px;top:50px;width:24px;height:1px;background:color(display-p3 0.2863 0.2863 0.2863)}
.ts .left{position:absolute;left:60px;top:36px;bottom:0;width:212px;border-right:.5px solid color(display-p3 1 1 1 / .1)}
.ts .ph{height:66.5px;padding:12px 18px;display:flex;flex-direction:column;gap:2px;border-bottom:.5px solid color(display-p3 0.9504 0.9566 0.9639 / .1)}
.ts .ph b{display:block;font-weight:500;font-size:14px;line-height:20px;color:color(display-p3 0.8766 0.8859 0.8968)}
.ts .ph span{display:flex;align-items:center;gap:4px;font-size:12px;line-height:20px;color:color(display-p3 0.6702 0.6856 0.7074)}
.ts .sec{display:flex;justify-content:space-between;align-items:center;padding:16px 10px 12px 18px;font-size:12px;line-height:normal;font-weight:500;color:color(display-p3 0.8766 0.8859 0.8968)}
.ts .list{padding:0 10px 12px}
.ts .row{display:flex;align-items:center;gap:8px;padding:6px 8px;border:2px solid transparent;border-left:0;border-right:0;border-radius:8px;font-size:12px;line-height:normal;color:color(display-p3 0.6702 0.6856 0.7074)}
.ts .row.cur{background:color(display-p3 1 1 1 / .1);color:color(display-p3 0.8766 0.8859 0.8968)}
.ts .split{height:1px;margin:7px 0 8px;background:color(display-p3 0.9504 0.9566 0.9639 / .1)}
.ts .tips{position:absolute;left:64px;bottom:16px;height:36px;display:flex;align-items:center;gap:3px;padding:0 14px 0 9px;border-radius:999px;background:color(display-p3 0.2 0.2 0.2 / .85);font-size:13px;font-weight:500}
.ts .mode{position:absolute;top:36px;left:720px;transform:translateX(-50%);height:56px;display:flex;gap:16px}
.ts .mt{display:flex;flex-direction:column;align-items:center;gap:16px;font-size:13px;font-weight:500;color:color(display-p3 0.5725 0.5725 0.5725)}
.ts .mt i{width:100%;height:3px;background:color(display-p3 1 1 1);opacity:0}.ts .mt.on{color:color(display-p3 1 1 1)}.ts .mt.on i{opacity:1}
.ts .mt span{display:flex;align-items:center;gap:6px;padding:0 10px}
.ts .node{position:absolute;width:225px;height:480px}
.ts .fbar{position:absolute;bottom:100%;left:0;right:0;padding-bottom:6px;height:30px;display:flex;align-items:center;gap:4px;color:color(display-p3 0.6745 0.6745 0.6745);font-size:12px}
.ts .fbar .ctr{flex:1;text-align:center}
.ts .fbar svg{visibility:hidden}
.ts[data-step=riff] .fbar.sel{color:color(display-p3 0.1 1 0.82);font-weight:500}
.ts[data-step=riff] .fbar.sel svg{visibility:visible}
.ts .ring{position:absolute;inset:-1.5px;border:1.5px solid color(display-p3 0 0.8706 0.7294);pointer-events:none}
.ts .hd{position:absolute;width:9px;height:9px;background:color(display-p3 1 1 1);border:.6px solid color(display-p3 0 0.8706 0.7294)}
.ts .screen{position:absolute;left:0;top:0;width:300px;height:640px;transform:scale(.75);transform-origin:0 0;overflow:hidden;background:color(display-p3 0.9516 0.9454 0.9274)}
/* 2px: anything thinner falls between device pixels at the canvas steps' zoom. */
.ts .node:after{content:"";position:absolute;inset:0;box-shadow:0 0 0 2px color(display-p3 1 1 1 / .1);pointer-events:none;z-index:${LAYER.top}}
.ts .tb{position:absolute;left:720px;bottom:16px;transform:translateX(-50%);display:flex;align-items:center;gap:2px;padding:2px;border-radius:8px;border:.5px solid color(display-p3 1 1 1 / .16);background:linear-gradient(180deg,color(display-p3 1 1 1 / .035),color(display-p3 1 1 1 / .015)),color(display-p3 0.1176 0.1176 0.1284 / .94);box-shadow:0 4px 12px color(display-p3 0 0 0 / .18)}
.ts .tb .t{width:32px;height:32px;border-radius:4px;display:grid;place-items:center;color:color(display-p3 0.6745 0.6745 0.6745)}
.ts .tb .t.on{background:color(display-p3 1 1 1 / .08);color:color(display-p3 1 1 1)}
.ts .tb .dv{width:.5px;height:20px;background:color(display-p3 1 1 1 / .16);margin:0 1px}
.ts .run{width:122px;height:32px;border-radius:4px;display:flex;align-items:center;justify-content:center;gap:7px;margin-left:6px;background:color(display-p3 1 1 1 / 0.1);color:color(display-p3 0.8784 0.8863 0.898);font-weight:500}
.ts .chat{position:absolute;right:0;top:36px;bottom:0;width:307px;border-left:.5px solid color(display-p3 1 1 1 / .1);display:flex;flex-direction:column}
.ts .ch{height:42px;flex:none;padding:0 8px;display:flex;align-items:center;justify-content:space-between;border-bottom:.5px solid color(display-p3 1 1 1 / .1);color:color(display-p3 0.5725 0.5725 0.5725)}
.ts .tx{flex:1;min-height:0;overflow:hidden;padding:12px;display:flex;flex-direction:column;justify-content:flex-end;gap:12px}
.ts .ub{align-self:flex-end;max-width:240px;background:color(display-p3 1 1 1 / .07);box-shadow:inset 0 0 0 .5px color(display-p3 1 1 1 / .08);color:color(display-p3 0.6392 0.6392 0.6392);padding:8px;border-radius:8px 8px 0 8px;display:flex;flex-direction:column;gap:6px}
.ts .chip{display:inline-flex;align-self:flex-start;align-items:center;gap:6px;height:22px;padding:0 8px 0 6px;border-radius:6px;background:color(display-p3 1 1 1 / .08);color:color(display-p3 0.6745 0.6745 0.6745);white-space:nowrap}
.ts .used{color:color(display-p3 0.4314 0.4314 0.4314)}
.ts .meta{color:color(display-p3 0.5725 0.5725 0.5725);font-size:12px;margin-top:-6px}
.ts .comp{position:relative;height:184px;flex:none;border-top:.5px solid color(display-p3 0.2863 0.2863 0.2863)}
.ts .inp{position:absolute;left:13px;top:12px;width:283px;font-size:13px;line-height:20px;padding:5px 0;color:color(display-p3 1 1 1)}
.ts .inp>div{position:absolute;left:0;top:5px;right:0}
.ts .muted{color:color(display-p3 0.3765 0.3765 0.3765)}
.ts .caret{display:inline-block;width:1px;height:15px;background:color(display-p3 1 1 1);vertical-align:-2px;margin-left:1px}
.ts[data-step=chat] .caret,.ts[data-step=riff] .caret{animation:ts-blink .9s step-end infinite}
.ts [data-typing] .caret{animation:none}
@keyframes ts-blink{0%{opacity:0}50%{opacity:1}}
.ts .inp .chip{margin-right:6px;vertical-align:1px}
.ts .cb{position:absolute;width:32px;height:32px;border-radius:4px;display:grid;place-items:center;color:color(display-p3 0.5725 0.5725 0.5725)}
.ts .send{position:absolute;left:263px;top:104px;width:32px;height:32px;border-radius:9999px;display:grid;place-items:center;background:color(display-p3 1 1 1);color:color(display-p3 0 0 0)}
.ts .send.off{background:color(display-p3 0.102 0.102 0.102);color:color(display-p3 0.5725 0.5725 0.5725)}
.ts .cfb{position:absolute;top:144px;height:28px;display:flex;align-items:center;gap:7px;padding:0 7px;color:color(display-p3 0.5725 0.5725 0.5725);font-size:12px;font-weight:500}
.ts .menu{position:absolute;right:6px;top:40px;width:220px;padding:6px;border-radius:8px;background:color(display-p3 0.1373 0.1373 0.1516);border:.5px solid color(display-p3 1 1 1 / .14);box-shadow:0 12px 32px color(display-p3 0 0 0 / .5)}
.ts .menu div{padding:7px 8px;border-radius:4px;font-size:12px;color:color(display-p3 0.6745 0.6745 0.6745)}
.ts .menu div:first-child{background:color(display-p3 1 1 1 / .1);color:color(display-p3 1 1 1)}
.ts .pick{position:absolute;outline:2px solid color(display-p3 0.98 0 0.229)}
.ts .bubble{position:absolute;width:304px;min-height:42px;display:flex;align-items:center;gap:12px;padding:6px 7px 6px 14px;border-radius:21px;corner-shape:superellipse(1.5);background:color(display-p3 0.1132 0.1132 0.1207);border:.5px solid color(display-p3 0.2863 0.2863 0.2863);box-shadow:0 2px 5px color(display-p3 0 0 0 / .1),0 8px 20px color(display-p3 0 0 0 / .5),0 18px 44px color(display-p3 0 0 0 / .22);font-size:13px;line-height:22px;color:color(display-p3 1 1 1)}
.ts .bubble .txt{flex:1;display:grid}
.ts .bubble .txt>*{grid-area:1/1}
.ts .bubble .fit{visibility:hidden}
.ts .bubble .go{width:30px;height:30px;flex:none;border-radius:9999px;display:grid;place-items:center;background:color(display-p3 1 1 1);color:color(display-p3 0 0 0)}
.ts [data-in]{opacity:0;transition:opacity .24s}
.ts [data-out]{transition:opacity .24s}
.ts[data-step=wrap] [data-in~=wrap],.ts[data-step=canvas] [data-in~=canvas],.ts[data-step=chat] [data-in~=chat],.ts[data-step=variations] [data-in~=variations],.ts[data-step=layouts] [data-in~=layouts],.ts[data-step=riff] [data-in~=riff]{opacity:1}
.ts .tx [data-in]{display:none}
.ts[data-step=wrap] .tx [data-in~=wrap],.ts[data-step=variations] .tx [data-in~=variations],.ts[data-step=layouts] .tx [data-in~=layouts],.ts[data-step=riff] .tx [data-in~=riff]{display:block}
.ts[data-step=wrap] .tx .ub[data-in~=wrap],.ts[data-step=variations] .tx .ub[data-in~=variations],.ts[data-step=layouts] .tx .ub[data-in~=layouts],.ts[data-step=riff] .tx .ub[data-in~=riff]{display:flex}
.ts .cv{position:absolute;left:0;top:0;width:1440px;height:900px;overflow:hidden}
.ts .cvi{position:absolute;left:0;top:0;width:1440px;height:1400px;transform-origin:702px 758px;will-change:transform;transition:transform .9s cubic-bezier(.2,.6,.2,1)}
.ts[data-step=variations] .cvi,.ts[data-step=layouts] .cvi,.ts[data-step=riff] .cvi{transform:translateY(-288px) scale(.68)}
.ts .rail,.ts .left,.ts .chat,.ts .tb,.ts .bar,.ts .mode,.ts .tips{transition:transform .5s cubic-bezier(.4,0,.2,1),opacity .4s ease}
.ts[data-step=variations] .rail,.ts[data-step=layouts] .rail,.ts[data-step=riff] .rail,.ts[data-step=carousels] .rail,.ts[data-step=variations] .left,.ts[data-step=layouts] .left,.ts[data-step=riff] .left,.ts[data-step=carousels] .left{transform:translateX(-12px);opacity:0}
.ts[data-step=variations] .chat,.ts[data-step=layouts] .chat,.ts[data-step=riff] .chat,.ts[data-step=carousels] .chat{transform:translateX(12px);opacity:0}
.ts[data-step=variations] .tips,.ts[data-step=layouts] .tips,.ts[data-step=riff] .tips,.ts[data-step=carousels] .tips{transform:translateY(8px);opacity:0}
.ts[data-step=variations] .tb,.ts[data-step=layouts] .tb,.ts[data-step=riff] .tb,.ts[data-step=carousels] .tb{transform:translate(-50%,8px);opacity:0}
.ts[data-step=variations] .bar,.ts[data-step=layouts] .bar,.ts[data-step=riff] .bar,.ts[data-step=carousels] .bar{transform:translateY(-6px);opacity:0}
.ts[data-step=variations] .mode,.ts[data-step=layouts] .mode,.ts[data-step=riff] .mode,.ts[data-step=carousels] .mode{transform:translate(-50%,-6px);opacity:0}
@media (prefers-reduced-motion: reduce){.ts *,.ts{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:1ms!important;transition-delay:0s!important}}
.ts[data-intro] .win,.ts[data-intro] canvas.refl,.ts[data-intro] .contact{animation:ts-rise .8s cubic-bezier(.2,0,0,1) both}
.ts[data-intro] .cvi>.node{animation:ts-land .5s cubic-bezier(.2,0,0,1) both}
.ts[data-intro] .cvi>.node:nth-child(1){animation-delay:.75s}
.ts[data-intro] .cvi>.node:nth-child(2){animation-delay:1s}
.ts[data-intro] .cvi>.node:nth-child(3){animation-delay:1.25s}
@keyframes ts-rise{from{opacity:0;transform:translateY(14px)}}
@keyframes ts-land{from{opacity:0;transform:translateY(12px)}}
.ts[data-step=variations] .cvi{transition:none;animation:ts-pinch 1.3s .95s cubic-bezier(.4,0,.2,1) both}
@keyframes ts-pinch{from{transform:none}to{transform:translateY(-288px) scale(.68)}}
.ts .v{opacity:0}
/* Layered before they appear, so the tiles' entrance never waits on a raster. */
.ts .v,.ts .c{will-change:transform,opacity}
.ts .gen,.ts .screen{will-change:opacity}
.ts[data-step=variations] .v,.ts[data-step=layouts] .v,.ts[data-step=riff] .v,.ts[data-step=carousels] .v,.ts[data-step=wrap] .v,.ts[data-step=wrap] .c{opacity:1}
.ts[data-step=variations] .v{animation:ts-in .5s cubic-bezier(.2,0,0,1) both;animation-delay:calc(2.3s + var(--i) * .14s)}
@keyframes ts-in{from{opacity:0;transform:translateY(24px)}}
.ts .gen{position:absolute;inset:0;overflow:hidden;z-index:${LAYER.over};background:linear-gradient(180deg,color(display-p3 0.1725 0.1725 0.1833),color(display-p3 0.1216 0.1216 0.1323));padding:30px 16px;display:flex;flex-direction:column;gap:12px;contain:strict;transition:opacity .4s;transition-delay:calc(var(--i) * .16s)}
.ts .gen:after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,color(display-p3 1 1 1 / .07) 50%,transparent 80%);transform:translateX(-100%);will-change:transform}
.ts[data-step=variations] .v .gen:after,.ts[data-step=carousels] .c .gen:after{animation:ts-shimmer 1.6s linear infinite}
@keyframes ts-shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.ts[data-step=variations] .gen{animation:ts-out .5s cubic-bezier(.2,0,0,1) both;animation-delay:calc(4.15s + var(--i) * .16s)}
@keyframes ts-out{to{opacity:0}}
/* Hidden until the placeholder lifts, or cream shows at its edges. */
@keyframes ts-show{from{opacity:0}}
.ts .v .screen,.ts .c .screen{opacity:0}
.ts[data-step=wrap] .v .screen,.ts[data-step=wrap] .c .screen,.ts[data-step=layouts] .v .screen,.ts[data-step=riff] .v .screen,.ts[data-step=carousels] .v .screen,.ts[data-step=carousels] .c .screen{opacity:1}
.ts[data-step=variations] .v .screen{opacity:1;animation:ts-show .5s cubic-bezier(.2,0,0,1) both;animation-delay:calc(4.15s + var(--i) * .16s)}
.ts[data-step=carousels] .c .screen{animation:ts-show .5s cubic-bezier(.2,0,0,1) both;animation-delay:calc(2.6s + var(--i) * .16s)}
.ts[data-step=wrap] .gen,.ts[data-step=layouts] .gen,.ts[data-step=riff] .gen,.ts[data-step=carousels] .v .gen{opacity:0}
.ts[data-step=riff] .cvi,.ts[data-step=carousels] .cvi{transform:translate(-253px,-492px) scale(.68)}
.ts[data-step=wrap] .cvi{transform:translate(-207px,-300px) scale(.5)}
.ts .c{opacity:0}
.ts[data-step=carousels] .c{opacity:1;animation:ts-in .5s cubic-bezier(.2,0,0,1) both;animation-delay:calc(1s + var(--i) * .14s)}
.ts[data-step=carousels] .c .gen{animation:ts-out .5s cubic-bezier(.2,0,0,1) both;animation-delay:calc(2.6s + var(--i) * .16s)}
.ts[data-step=carousels] .v .gen{animation:none}
.ts .hl{outline:3px solid transparent;outline-offset:5px}
.ts[data-step=riff] .hl{outline-color:color(display-p3 0.98 0 0.229)}
.ts .ptr{position:absolute;filter:drop-shadow(0 2px 3px color(display-p3 0 0 0 / .45));transform-origin:30% 18%}
.ts[data-step=riff] .ptr{animation:ts-click .3s 1s both}
@keyframes ts-click{50%{transform:scale(.82)}}
.ts[data-step=riff] .hl{transition:outline-color 0s 1.1s}
.ts .bubble{transform-origin:50% 100%;transition:none}
.ts[data-step=riff] .bubble{transition:none;animation:ts-bin 220ms cubic-bezier(.34,1.3,.64,1) 1.1s backwards,ts-bfade 110ms cubic-bezier(.24,1,.4,1) 1.1s backwards}
.ts[data-step=riff][data-send] .bubble{animation:ts-blift 170ms cubic-bezier(.4,0,.2,1) 140ms forwards}
.ts[data-step=riff][data-send] .bubble .go{animation:ts-press 160ms ease-out both}
@keyframes ts-bin{from{transform:translateY(6px) scale(.96,.9)}}
@keyframes ts-bfade{from{opacity:0}}
@keyframes ts-blift{25%{opacity:1;transform:translateY(1.2px) scale(.99)}to{opacity:0;transform:translateY(-9px)}}
@keyframes ts-press{50%{transform:scale(.88)}}
.ts[data-step=riff] .node [data-in~=riff],.ts[data-step=riff] .fbar.sel{transition-delay:1.1s}
.ts .app{position:absolute;inset:0;color:color(display-p3 0.102 0.102 0.0948);font:13px/1.45 var(--font-family-body)}
.ts .serif{font-family:Charter,"Iowan Old Style",Georgia,serif;font-weight:400;letter-spacing:-.01em}
.ts .top{display:flex;justify-content:space-between;align-items:center;padding:18px 16px 0;color:color(display-p3 0.2268 0.2237 0.2129)}
.ts .brand{display:flex;align-items:center;gap:8px;color:color(display-p3 0.0784 0.0784 0.0784)}
.ts .brand span{font-family:Charter,"Iowan Old Style",Georgia,serif;font-size:17px}
.ts .tabbar{position:absolute;left:0;right:0;bottom:0;height:64px;border-top:.5px solid color(display-p3 0 0 0 / .1);display:flex;justify-content:space-around;padding-top:12px;color:color(display-p3 0.558 0.5456 0.5169);background:color(display-p3 0.9516 0.9454 0.9274 / .94)}
.ts .tabbar .on{color:color(display-p3 0.0784 0.0784 0.0784)}
.ts .tabbar:after{content:"";position:absolute;bottom:8px;left:50%;width:90px;height:3px;border-radius:2px;background:color(display-p3 0.8083 0.7928 0.7569);transform:translateX(-50%)}
.ts canvas{display:block;width:100%;height:100%;border-radius:2px;background:color(display-p3 0.0392 0.0392 0.0392)}
.ts .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:.5px solid color(display-p3 0 0 0 / .35);border-radius:3px;font-size:12px;color:color(display-p3 0.0784 0.0784 0.0784)}
.ts .search{margin:14px 12px 0;display:flex;align-items:center;gap:10px;padding:10px 12px;border:.5px solid color(display-p3 0 0 0 / .18);border-radius:4px;color:color(display-p3 0.558 0.5456 0.5169);font-size:12px}
.ts .tabs{display:flex;justify-content:space-around;margin-top:12px;border-bottom:.5px solid color(display-p3 0 0 0 / .1);font-size:12px;color:color(display-p3 0.558 0.5456 0.5169)}
.ts .tabs span{padding:9px 0}.ts .tabs .on{color:color(display-p3 0.0784 0.0784 0.0784);border-bottom:1.5px solid color(display-p3 0.0784 0.0784 0.0784)}
.ts .item{display:flex;gap:14px;padding:10px 12px;border-bottom:.5px solid color(display-p3 0 0 0 / .08)}
.ts .item .th{width:80px;height:60px;flex:none}
.ts .item b{display:block;font-weight:400;color:color(display-p3 0.0784 0.0784 0.0784);font-size:13px;line-height:1.3}
.ts .item small,.ts .card small{display:block;color:color(display-p3 0.558 0.5456 0.5169);font-size:11px;margin-top:3px}
.ts .sct{display:flex;justify-content:space-between;padding:18px 12px 8px;font-size:11px;color:color(display-p3 0.558 0.5456 0.5169)}
.ts .cards{display:flex;gap:10px;padding:0 12px}
.ts .card{flex:1;min-width:0}.ts .card .th{height:70px}
.ts .card b{display:block;margin-top:7px;font-weight:400;color:color(display-p3 0.0784 0.0784 0.0784);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ts .copy{margin-top:14px;font-family:Charter,"Iowan Old Style",Georgia,serif;font-size:15px;line-height:1.55;color:color(display-p3 0.2888 0.2826 0.2647)}
`;

const ico = (d: string, s = 16): string => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none">${d}</svg>`;
const mi = (d: string, s = 20): string => `<svg width="${s}" height="${s}" viewBox="0 -960 960 960" fill="currentColor"><path d="${d}"/></svg>`;
const MI = {
  back: 'm274-450 248 248-42 42-320-320 320-320 42 42-248 248h526v60H274Z',
  bookmark: 'M200-120v-665q0-24 18-42t42-18h440q24 0 42 18t18 42v665L480-240 200-120Zm60-91 220-93 220 93v-574H260v574Zm0-574h440-440Z',
  home: 'M220-180h150v-250h220v250h150v-390L480-765 220-570v390Zm-60 60v-480l320-240 320 240v480H530v-250H430v250H160Zm320-353Z',
  menu: 'M120-240v-60h720v60H120Zm0-210v-60h720v60H120Zm0-210v-60h720v60H120Z',
  more: 'M207.86-432Q188-432 174-446.14t-14-34Q160-500 174.14-514t34-14Q228-528 242-513.86t14 34Q256-460 241.86-446t-34 14Zm272 0Q460-432 446-446.14t-14-34Q432-500 446.14-514t34-14Q500-528 514-513.86t14 34Q528-460 513.86-446t-34 14Zm272 0Q732-432 718-446.14t-14-34Q704-500 718.14-514t34-14Q772-528 786-513.86t14 34Q800-460 785.86-446t-34 14Z',
  ne: 'm202-160-42-42 498-498H364v-60h396v396h-60v-294L202-160Z',
  search: 'M796-121 533-384q-30 26-70 40.5T378-329q-108 0-183-75t-75-181q0-106 75-181t182-75q106 0 180.5 75T632-585q0 43-14 83t-42 75l264 262-44 44ZM377-389q81 0 138-57.5T572-585q0-81-57-138.5T377-781q-82 0-139.5 57.5T180-585q0 81 57.5 138.5T377-389Z',
  tune: 'M427-120v-225h60v83h353v60H487v82h-60Zm-307-82v-60h247v60H120Zm187-166v-82H120v-60h187v-84h60v226h-60Zm120-82v-60h413v60H427Zm166-165v-225h60v82h187v60H653v83h-60Zm-473-83v-60h413v60H120Z',
};
const I = {
  refresh: CENTRAL.IconArrowRotateClockwise,
  dots: CENTRAL.IconDotGrid1x3Horizontal,
  files: CENTRAL.IconFiles,
  shapes: CENTRAL.IconPlayground,
  help: CENTRAL.IconCircleQuestionmark,
  branch: CENTRAL.IconBranch,
  plus: CENTRAL.IconPlusMedium,
  browser: CENTRAL.IconWindow2,
  pointer: CENTRAL.IconCursor1,
  hand: CENTRAL.IconHand5Finger,
  text: CENTRAL.IconText1,
  image: CENTRAL.IconImages3,
  play: CENTRAL.IconPlayCircle,
  design: CENTRAL.IconSquareCursor,
  preview: CENTRAL.IconPlay,
  bell: CENTRAL.IconBell,
  spark: CENTRAL.IconCursorClick,
  arrow: CENTRAL.IconArrowRight,
  chev: CENTRAL.IconChevronDownMedium,
  bulb: CENTRAL.IconLightBulb,
  projects: CENTRAL.IconProjects,
  railLeft: CENTRAL.IconSidebarSimpleLeftSquare,
  railRight: CENTRAL.IconSidebarSimpleRightSquare,
  close: CENTRAL.IconCrossMedium,
};
/** The macOS arrow from the marketing site's install steps. */
const MAC_ARROW =
  '<svg width="26" height="26" viewBox="0 0 28 28"><polygon fill="color(display-p3 1 1 1)" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6"/><polygon fill="color(display-p3 1 1 1)" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5"/><rect x="12.5" y="13.6" transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)" width="2" height="8"/><polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5"/></svg>';
const RIFF_PROMPT = t('tour.scene.carouselsPrompt');
const STOP_CIRCLE =
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12Z" fill="currentColor"/><path d="M9.5 10.5C9.5 9.94772 9.94772 9.5 10.5 9.5H13.5C14.0523 9.5 14.5 9.94772 14.5 10.5V13.5C14.5 14.0523 14.0523 14.5 13.5 14.5H10.5C9.94772 14.5 9.5 14.0523 9.5 13.5V10.5Z" fill="currentColor"/>';
const MARK =
  '<svg width="20" height="20" viewBox="0 0 120 120" fill="currentColor"><circle cx="60" cy="22" r="16"/><path d="M36 48h48v66L60 94 36 114Z"/></svg>';
const GH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">${CENTRAL.IconGithub}</svg>`;
const CLAUDE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5.92405 15.2962L9.85823 13.0903L9.92405 12.8981L9.85823 12.7918H9.66582L9.0076 12.7513L6.75949 12.6906L4.81013 12.6097L2.92152 12.5085L2.44557 12.4073L2 11.8204L2.04557 11.5269L2.44557 11.2588L3.01772 11.3094L4.28354 11.3954L6.18228 11.5269L7.55949 11.6079L9.6 11.8204H9.92405L9.96962 11.6888L9.85823 11.6079L9.77215 11.5269L7.8076 10.1963L5.68101 8.78978L4.56709 7.98027L3.96456 7.57045L3.66076 7.18594L3.52911 6.34607L4.07595 5.74399L4.81013 5.79459L4.99747 5.84518L5.74177 6.4169L7.33165 7.64635L9.4076 9.1743L9.71139 9.42727L9.83291 9.34126L9.8481 9.28055L9.71139 9.05287L8.58228 7.01391L7.37722 4.93954L6.84051 4.07943L6.69873 3.56337C6.6481 3.35087 6.61266 3.17379 6.61266 2.95624L7.23544 2.11131L7.57975 2L8.41013 2.11131L8.75949 2.41487L9.27595 3.59373L10.1114 5.45054L11.4076 7.97521L11.7873 8.72401L11.9899 9.41715L12.0658 9.62965H12.1975V9.50822L12.3038 8.08652L12.5013 6.34101L12.6937 4.09461L12.7595 3.46218L13.0734 2.70326L13.6962 2.29345L14.1823 2.52618L14.5823 3.0979L14.5266 3.46724L14.2886 5.01037L13.8228 7.42879L13.519 9.04781H13.6962L13.8987 8.84543L14.719 7.75765L16.0962 6.03744L16.7038 5.35441L17.4127 4.60056L17.8684 4.24134H18.7291L19.362 5.18239L19.0785 6.15381L18.1924 7.27701L17.4582 8.22818L16.4051 9.64483L15.7468 10.7781L15.8076 10.8692L15.9646 10.854L18.3443 10.3481L19.6304 10.1154L21.1646 9.85226L21.8582 10.1761L21.9342 10.5049L21.6608 11.1778L20.0203 11.5826L18.0962 11.9671L15.2304 12.6451L15.1949 12.6704L15.2354 12.721L16.5266 12.8424L17.0785 12.8728H18.4304L20.9468 13.06L21.6051 13.4951L22 14.0263L21.9342 14.4311L20.9215 14.9471L19.5544 14.6233L16.3646 13.8644L15.2709 13.5912H15.119V13.6823L16.0304 14.5727L17.7013 16.0804L19.7924 18.0233L19.8987 18.5039L19.6304 18.8834L19.3468 18.8429L17.5089 17.4617L16.8 16.8394L15.1949 15.4885H15.0886V15.6302L15.4582 16.1715L17.4127 19.106L17.5139 20.0066L17.3722 20.3L16.8658 20.4771L16.3089 20.3759L15.1646 18.7721L13.9848 16.9658L13.0329 15.3468L12.9165 15.4126L12.3544 21.4586L12.0911 21.7673L11.4835 22L10.9772 21.6155L10.7089 20.9932L10.9772 19.7637L11.3013 18.1599L11.5646 16.8849L11.8025 15.3013L11.9443 14.7751L11.9342 14.7397L11.8177 14.7549L10.6228 16.3941L8.80506 18.848L7.36709 20.386L7.02279 20.5226L6.42532 20.214L6.48101 19.6625L6.81519 19.1718L8.80506 16.642L10.0051 15.0736L10.7797 14.168L10.7747 14.0364H10.7291L5.44304 17.4667L4.50127 17.5882L4.0962 17.2087L4.14684 16.5864L4.33924 16.384L5.92911 15.2912L5.92405 15.2962Z"/></svg>';
const ONLOOK =
  '<svg width="20" height="20" viewBox="0 0 180 180"><path fill="currentColor" fill-rule="evenodd" d="M136.87 166.85A90 90 0 1 0 19.76 146.28l32.85-26.23V67.15L32.54 47.08h95.59a12.96 12.96 0 0 1 12.96 12.96v23.18c-6.76-4.68-11.63-8.45-11.63-8.45l-22.85 13.85 39.12 33.23ZM92.51 57.16h27.34s1.03 11.38-13.93 11.38c-13.41-11.38-13.41-11.38-13.41-11.38Z"/></svg>';

const art = (a: string): string => `<canvas data-art="${a}"></canvas>`;
const tabbar = (on: number): string =>
  `<div class="tabbar">${[MI.home, MI.search, MI.bookmark].map((d, i) => `<span${i === on ? ' class="on"' : ''}>${mi(d)}</span>`).join('')}</div>`;

const homeScreen = (hero: string, card1: string, card2: string): string => `<div class="app">
 <div class="top"><span class="brand">${MARK}</span>${mi(MI.menu)}</div>
 <div style="padding:26px 12px 0"><h1 class="serif" style="margin:0;font-size:32px;line-height:1.1;color:color(display-p3 0.0784 0.0784 0.0784)">Stay curious.<br>Read widely.</h1>
  <p style="margin:10px 0 0;font-size:12px;color:color(display-p3 0.4175 0.4082 0.3867)">Thoughtful writing on design, technology, and the future of making.</p></div>
 <div style="margin:14px 12px 0;height:140px">${art(hero)}</div>
 <div style="padding:12px 12px 0"><span class="btn">Explore latest ${mi(MI.ne, 14)}</span></div>
 <div class="sct"><span>Latest essays</span><span>See all</span></div>
 <div class="cards"><div class="card"><div class="th">${art(card1)}</div><b>Designing for attention</b><small>Priya Shah · 15 min</small></div>
  <div class="card"><div class="th">${art(card2)}</div><b>Interfaces are negotiations</b><small>Aidan Levin · 8 min</small></div></div>
 ${tabbar(0)}</div>`;

const ESSAYS: [string, string, string, string][] = [
  ['slab:cube2', 'Material honesty', 'Ines Duarte', '11'],
  ['metal:wave:rim', 'Notes on rhythm', 'Theo Marsh', '9'],
  ['slab:ledge', 'Designing for attention', 'Priya Shah', '15'],
  ['metal:twist:highkey', 'Interfaces are negotiations', 'Aidan Levin', '8'],
  ['slab:cube', 'Systems over screens', 'Marco Neri', '10'],
  ['metal:coil:spot', 'The quiet interface', 'Hana Okafor', '6'],
];
const searchScreen = `<div class="app">
 <div class="top">${mi(MI.back)}</div>
 <div class="search">${mi(MI.search, 16)}Search essays…<span style="margin-left:auto">${mi(MI.tune, 16)}</span></div>
 <div class="tabs"><span class="on">Essays</span><span>Authors</span><span>Topics</span></div>
 ${ESSAYS.map(([a, t, n, m]) => `<div class="item"><div class="th">${art(a)}</div><div><b>${t}</b><small>${n}</small><small>${m} min read</small></div></div>`).join('')}
 ${tabbar(1)}</div>`;

const readScreen = `<div class="app">
 <div class="top">${mi(MI.back)}<span style="display:flex;gap:16px">${mi(MI.bookmark)}${mi(MI.more)}</span></div>
 <div style="margin:14px 10px 0;height:170px">${art('metal:sweep:night')}</div>
 <div style="padding:16px 12px 0"><small style="font-size:11px;color:color(display-p3 0.4175 0.4082 0.3867)">Lena Reinhart</small>
  <h2 class="serif" style="margin:4px 0 0;font-size:26px;color:color(display-p3 0.0784 0.0784 0.0784)">The craft of clarity</h2>
  <small style="display:block;font-size:11px;color:color(display-p3 0.558 0.5456 0.5169);margin-top:6px">12 min read · May 14, 2024</small>
  <p class="serif" style="margin:16px 0 0;font-size:19px;line-height:1.38;color:color(display-p3 0.0784 0.0784 0.0784)">Clarity is not the absence of complexity. It is the art of making relationships obvious.</p>
  <p class="copy">Every interface is an argument about what matters. The best ones make that argument quietly.</p></div>
 ${tabbar(0)}</div>`;

const frame = (x: number, y: number, title: string, screen: string, cls = 'node'): string =>
  `<div class="${cls}" style="left:${x}px;top:${y}px">
  <div class="fbar">${ico(I.refresh)}<span class="ctr">${title}</span>${ico(I.dots)}</div>
  <div class="screen">${screen}</div></div>`;


/** A new browser in the row under the pages: a skeleton while it generates, then its layout. */
const variation = (x: number, i: number, title: string, screen: string, y = 803, cls = 'node v'): string =>
  `<div style="--i:${i}">${frame(x, y, title, screen, cls).replace(/<\/div>$/, '<div class="gen"></div></div>')}</div>`;

/** Canvas selection on a browser: teal ring, corner handles, teal title. Shown on the riff step. */
const RING =
  '<div data-in="riff"><div class="ring"></div><b class="hd" style="left:-4.5px;top:-4.5px"></b><b class="hd" style="right:-4.5px;top:-4.5px"></b><b class="hd" style="left:-4.5px;bottom:-4.5px"></b><b class="hd" style="right:-4.5px;bottom:-4.5px"></b></div>';
const selected = (html: string): string =>
  html.replace('<div class="fbar">', '<div class="fbar sel">').replace(/<\/div><\/div>$/, `${RING}</div></div>`);

const row = (a: string, t: string, n: string, m: string): string =>
  `<div style="display:flex;gap:14px;padding:12px 0;border-bottom:.5px solid color(display-p3 0 0 0 / .08)"><div style="width:64px;height:48px;flex:none">${art(a)}</div><div><b style="display:block;font-weight:400;color:color(display-p3 0.0784 0.0784 0.0784);font-size:13px;line-height:1.3">${t}</b><small style="display:block;color:color(display-p3 0.558 0.5456 0.5169);font-size:11px;margin-top:3px">${n} · ${m} min</small></div></div>`;

const fullBleed = `<div class="app">
 <div style="position:absolute;left:0;right:0;top:0;height:300px">${art('metal:coil:spot')}</div>
 <div class="top" style="position:relative;padding:22px 20px 0;color:color(display-p3 1 1 1)"><span class="brand" style="color:color(display-p3 1 1 1)">${MARK}</span>${mi(MI.menu)}</div>
 <div style="position:absolute;left:20px;right:20px;top:190px;color:color(display-p3 1 1 1)"><small style="font-size:11px;opacity:.75">Issue 14 · Autumn</small>
  <h1 class="serif" style="margin:4px 0 0;font-size:34px;line-height:1.05">Stay curious.</h1>
  <p style="margin:8px 0 0;font-size:12px;opacity:.8">Thoughtful writing on design and making.</p></div>
 <div style="position:absolute;left:20px;right:20px;top:322px"><div class="sct" style="padding:0 0 4px"><span>Latest essays</span><span>See all</span></div>
  ${ESSAYS.slice(2, 5).map(([a, t, n, m]) => row(a, t, n, m)).join('')}</div>
 ${tabbar(0)}</div>`;

const editorial = `<div class="app">
 <div class="top" style="padding:22px 20px 0"><span class="brand">${MARK}</span>${mi(MI.search)}</div>
 <div style="padding:34px 20px 22px;border-bottom:.5px solid color(display-p3 0 0 0 / .12)"><small style="font-size:11px;color:color(display-p3 0.558 0.5456 0.5169)">Issue 14 · Autumn</small>
  <h1 class="serif" style="margin:8px 0 0;font-size:31px;line-height:1.08;color:color(display-p3 0.0784 0.0784 0.0784)">The craft of clarity</h1>
  <p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:color(display-p3 0.4175 0.4082 0.3867)">Six essays on making relationships obvious.</p></div>
 <div style="padding:0 20px">
 ${ESSAYS.map(([, t, n, m], k) => `<div style="display:flex;gap:14px;padding:12px 0;border-bottom:.5px solid color(display-p3 0 0 0 / .08)"><span class="serif" style="font-size:20px;line-height:1.1;color:color(display-p3 0.7064 0.6909 0.655);width:16px">${k + 1}</span><div><b class="serif" style="display:block;font-size:15px;font-weight:400;color:color(display-p3 0.0784 0.0784 0.0784)">${t}</b><small style="display:block;font-size:11px;color:color(display-p3 0.558 0.5456 0.5169)">${n} · ${m} min</small></div></div>`).join('')}</div>
 ${tabbar(0)}</div>`;

const chip = (t: string, on = false): string =>
  `<span style="padding:5px 11px;border-radius:999px;font-size:11px;${on ? 'background:color(display-p3 0.0784 0.0784 0.0784);color:color(display-p3 0.9516 0.9454 0.9274)' : 'border:.5px solid color(display-p3 0 0 0 / .2);color:color(display-p3 0.4175 0.4082 0.3867)'}">${t}</span>`;
const carouselTop = `<div class="top" style="padding:22px 20px 0"><span class="brand">${MARK}</span>${mi(MI.menu)}</div>
 <h1 class="serif" style="margin:28px 20px 0;font-size:30px;line-height:1.08;color:#141414">Read widely.</h1>
 <div style="display:flex;gap:6px;margin:16px 20px 18px">${chip('All', true)}${chip('Design')}${chip('Craft')}${chip('Systems')}</div>`;
const dots = (n: number, on: number): string =>
  `<div style="display:flex;justify-content:center;gap:5px;margin-top:14px">${Array.from({ length: n }, (_, k) => `<i style="display:block;width:${k === on ? 14 : 5}px;height:5px;border-radius:3px;background:${k === on ? '#141414' : 'rgba(0,0,0,.18)'}"></i>`).join('')}</div>`;

const latest = (from: number): string =>
  `<div style="padding:0 20px"><div class="sct" style="padding:20px 0 2px"><span>Latest</span><span>See all</span></div>${ESSAYS.slice(from, from + 2).map(([a, t, n, m]) => row(a, t, n, m)).join('')}</div>`;

const peek = `<div class="app">${carouselTop}
 <div style="display:flex;gap:12px;padding-left:20px;overflow:hidden">
 ${ESSAYS.slice(0, 3).map(([a, t, n, m]) => `<div style="flex:0 0 196px"><div style="height:170px;border-radius:4px;overflow:hidden">${art(a)}</div><b class="serif" style="display:block;margin-top:9px;font-size:15px;font-weight:400;color:#141414;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</b><small style="display:block;margin-top:2px;font-size:11px;color:#8f8b83">${n} · ${m} min</small></div>`).join('')}</div>
 ${dots(4, 0)}${latest(3)}${tabbar(0)}</div>`;

const stackCard = (a: string, t: string, n: string, m: string): string =>
  `<div style="height:160px;border-radius:8px 8px 0 0;overflow:hidden">${art(a)}</div><div style="padding:11px 14px 0"><b class="serif" style="display:block;font-size:17px;font-weight:400;color:#141414">${t}</b><div style="display:flex;justify-content:space-between;margin-top:3px;font-size:11px;color:#8f8b83"><span>${n}</span><span>${m} min read</span></div></div>`;
const stack = `<div class="app">${carouselTop}
 <div style="position:relative;height:238px;margin:0 20px">
  ${[2, 1].map((k) => `<div style="position:absolute;left:${k * 9}px;right:${k * 9}px;top:${k * 9}px;height:218px;border-radius:8px;background:color(display-p3 0.98 0.976 0.965);box-shadow:0 0 0 .5px rgba(0,0,0,.1),0 4px 12px rgba(0,0,0,.05)"></div>`).join('')}
  <div style="position:absolute;left:0;right:0;top:0;height:218px;border-radius:8px;background:color(display-p3 0.98 0.976 0.965);box-shadow:0 0 0 .5px rgba(0,0,0,.1),0 8px 20px rgba(0,0,0,.08);overflow:hidden">${stackCard('slab:ledge', 'Designing for attention', 'Priya Shah', '15')}</div>
 </div>
 <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 20px 0;font-size:11px;color:#8f8b83"><span>1 of 4</span><span>Swipe for more</span></div>
 ${latest(3)}${tabbar(0)}</div>`;

const strip = `<div class="app">${carouselTop}
 <div style="margin:0 20px;padding:16px 16px 14px;height:250px;border-radius:8px;background:color(display-p3 0.098 0.094 0.086);color:color(display-p3 0.953 0.945 0.925);display:flex;flex-direction:column">
  <div style="display:flex;gap:4px">${[1, 0.55, 0.2, 0.2].map((o, k) => `<i style="flex:1;height:2px;border-radius:1px;background:rgba(243,241,236,${k === 1 ? 0.25 : o})">${k === 1 ? '<i style="display:block;width:55%;height:2px;border-radius:1px;background:#f3f1ec"></i>' : ''}</i>`).join('')}</div>
  <small style="margin-top:18px;font-size:10px;letter-spacing:.02em;opacity:.6">From Notes on rhythm</small>
  <p class="serif" style="margin:8px 0 0;font-size:21px;line-height:1.28">“A layout is a tempo. Every gap tells the eye when to rest.”</p>
  <div style="margin-top:auto;display:flex;align-items:center;gap:8px;font-size:11px"><span style="width:22px;height:22px;border-radius:50%;background:rgba(243,241,236,.16);display:grid;place-items:center;font-size:9px">TM</span><span>Theo Marsh</span><span style="margin-left:auto;opacity:.6">9 min read</span></div>
 </div>
 <div style="display:flex;justify-content:space-between;margin:12px 20px 0;font-size:11px;color:#8f8b83"><span>2 of 4</span><span>Tap to read</span></div>
 ${latest(4)}${tabbar(0)}</div>`;

const grid = `<div class="app">
 <div class="top" style="padding:22px 20px 0"><span class="brand">${MARK}</span>${mi(MI.menu)}</div>
 <h1 class="serif" style="margin:28px 20px 0;font-size:30px;line-height:1.08;color:color(display-p3 0.0784 0.0784 0.0784)">Read widely.</h1>
 <div style="display:flex;gap:6px;margin:16px 20px 20px">${chip('All', true)}${chip('Design')}${chip('Craft')}${chip('Systems')}</div>
 <div class="hl" style="display:grid;grid-template-columns:1fr 1fr;gap:18px 12px;margin:0 20px">
 ${ESSAYS.slice(0, 4).map(([a, t, n]) => `<div class="card"><div class="th" style="height:104px">${art(a)}</div><b>${t}</b><small>${n}</small></div>`).join('')}</div>
 <div style="margin:22px 20px 0;padding-top:14px;border-top:.5px solid color(display-p3 0 0 0 / .1);display:flex;justify-content:space-between;font-size:11px;color:color(display-p3 0.558 0.5456 0.5169)"><span>Continue: The craft of clarity</span><span>40%</span></div>
 <div style="margin:8px 20px 0;height:2px;background:color(display-p3 0 0 0 / .08)"><div style="width:40%;height:2px;background:color(display-p3 0.0784 0.0784 0.0784)"></div></div>
 ${tabbar(0)}</div>`;

const BG =
  '<div class="bgx"><canvas class="bdp" data-art="backdrop"></canvas></div>' +
  '<canvas class="refl"></canvas><div class="contact"></div>';

/** The editor as the floor sees it: flat shapes for the bright parts that should show in the reflection. */
function paintReflectionSource(W: number, H: number): HTMLCanvasElement {
  const t = document.createElement('canvas');
  t.width = W;
  t.height = H;
  const c = t.getContext('2d', { colorSpace: 'display-p3' });
  if (!c) return t;
  const k = W / 1440;
  c.scale(k, k);
  c.fillStyle = 'color(display-p3 0.0784 0.0784 0.0892)';
  c.beginPath();
  c.roundRect(0, 0, 1440, 900, 18);
  c.fill();
  c.fillStyle = 'color(display-p3 0.9516 0.9454 0.9274)';
  for (const x of [325, 590, 855]) c.fillRect(x, 263, 225, 480);
  c.fillStyle = 'color(display-p3 0.1137 0.1137 0.1281)';
  c.beginPath();
  c.roundRect(560, 846, 320, 38, 8);
  c.fill();
  c.fillStyle = 'color(display-p3 0.24 0.24 0.25)';
  c.beginPath();
  c.roundRect(752, 849, 122, 32, 4);
  c.fill();
  c.fillStyle = 'color(display-p3 0.2 0.2 0.2107)';
  c.beginPath();
  c.roundRect(64, 848, 86, 36, 18);
  c.fill();
  return t;
}

const REFL_FS = `precision highp float;varying vec2 v;uniform sampler2D t;uniform float ratio;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1)),f.x),f.y);}
void main(){
 float d=1.-v.y;
 float r=.002+d*d*.09+d*.05;
 float streak=(n(vec2(v.x*3.,v.y*260.))-.5)*.035*d+(n(vec2(v.x*9.,v.y*900.))-.5)*.01;
 float a0=h(gl_FragCoord.xy)*6.2831;
 vec4 acc=vec4(0.);float ws=0.;
 for(int i=0;i<40;i++){float fi=float(i);float rr=sqrt((fi+.5)/40.);float ang=a0+fi*2.39996;
  vec2 o=vec2(cos(ang)*rr*r*.35,sin(ang)*rr*r*1.6);
  vec2 uv=vec2(v.x+o.x+streak*.3,1.-(d*ratio+o.y*ratio+streak));
  float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  vec4 c=texture2D(t,clamp(uv,0.,1.));c.a*=inside;
  float w=1.-rr*.6;acc+=vec4(c.rgb*c.a,c.a)*w;ws+=w;}
 acc/=ws;
 float fade=pow(1.-smoothstep(0.,1.,d),.9)*.7;
 gl_FragColor=vec4(acc.a>0.?acc.rgb/acc.a:vec3(0.),acc.a*fade);}`;

/** The floor's rough-gloss reflection of the editor: blur that grows with distance, stretched vertically, broken by brushed streaks. Painted once. */
let reflection: HTMLCanvasElement | null = null;

function paintReflection(cv: HTMLCanvasElement): void {
  if (reflection) {
    const copy = document.createElement('canvas');
    copy.width = reflection.width;
    copy.height = reflection.height;
    copy.getContext('2d', { colorSpace: 'display-p3' })?.drawImage(reflection, 0, 0);
    copy.className = cv.className;
    cv.replaceWith(copy);
    return;
  }
  cv.width = 1440;
  cv.height = 330;
  const gl = cv.getContext('webgl', { premultipliedAlpha: false, alpha: true, preserveDrawingBuffer: true });
  if (!gl) return;
  gl.drawingBufferColorSpace = 'display-p3';
  gl.unpackColorSpace = 'display-p3';
  const sh = (type: number, src: string): WebGLShader => {
    const o = gl.createShader(type)!;
    gl.shaderSource(o, src);
    gl.compileShader(o);
    return o;
  };
  const pr = gl.createProgram()!;
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0,1);}'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, REFL_FS));
  gl.linkProgram(pr);
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paintReflectionSource(1440, 900));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1f(gl.getUniformLocation(pr, 'ratio'), 330 / 900);
  gl.viewport(0, 0, cv.width, cv.height);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // The pixels stay in the 2D copy, so the GL context can go.
  const still = document.createElement('canvas');
  still.width = cv.width;
  still.height = cv.height;
  still.getContext('2d', { colorSpace: 'display-p3' })?.drawImage(cv, 0, 0);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  still.className = cv.className;
  cv.replaceWith(still);
  reflection = still;
}

const WIN = `<div class="win">
 <div class="cv"><div class="cvi">
 ${frame(325, 263, 'Home', homeScreen('metal:fold:side', 'slab:ledge', 'metal:twist:highkey'))}
 ${frame(590, 263, 'Search', searchScreen)}
 ${frame(855, 263, 'Read', readScreen)}
 ${variation(325, 0, 'Home — full bleed', fullBleed)}
 ${variation(590, 1, 'Home — editorial', editorial)}
 ${selected(variation(855, 2, 'Home — grid', grid))}
 ${variation(1120, 0, 'Carousel — peek', peek, 803, 'node c')}
 ${variation(1385, 1, 'Carousel — stack', stack, 803, 'node c')}
 ${variation(1650, 2, 'Carousel — quotes', strip, 803, 'node c')}
 </div></div>
 <span class="ptr" data-in="riff" style="left:658px;top:486px">${MAC_ARROW}</span>
 <div class="bubble" data-in="riff" style="left:478px;top:324px"><span class="txt"><span class="fit" aria-hidden="true">${t('tour.scene.carouselsPrompt')}</span><span><span class="typed"></span><span class="caret"></span></span></span><span class="go">${ico(I.arrow, 18)}</span></div>

 <div class="mode"><div class="mt on"><i></i><span>${ico(I.design)}${t('canvas.mode.design')}</span></div><div class="mt"><i></i><span>${ico(I.preview)}${t('canvas.mode.interact')}</span></div></div>

 <div class="rail surface"><span class="rb" style="top:10px">${ONLOOK}</span><span class="rule"></span>
  <span class="rb on" style="top:63px">${ico(I.files, 20)}</span><span class="rl on" style="top:99px">${t('rail.files')}</span>
  <span class="rb" style="top:119px">${ico(I.shapes, 20)}</span><span class="rl" style="top:155px">${t('rail.artifacts.caption')}</span>
  <span class="rb" style="bottom:16px">${ico(I.help, 20)}</span></div>

 <div class="left surface">
  <div class="ph"><b>Reading app</b><span>${ico(I.branch, 13)}onlook-dev/reading-app</span></div>
  <div class="sec">${t('sidebar.pages')}${ico(I.plus)}</div>
  <div class="list"><div class="row cur">Home</div><div class="row">Search</div><div class="row">Read</div></div>
  <div class="split"></div><div class="sec" style="padding-right:18px">${t('sidebar.designs')}</div>
  <div class="list"><div class="row">${ico(I.browser, 14)}Home</div><div class="row">${ico(I.browser, 14)}Search</div><div class="row">${ico(I.browser, 14)}Read</div>
   <div class="row" data-in="variations layouts riff wrap">${ico(I.browser, 14)}Home — full bleed</div><div class="row" data-in="variations layouts riff wrap">${ico(I.browser, 14)}Home — editorial</div><div class="row" data-in="variations layouts riff wrap">${ico(I.browser, 14)}Home — grid</div><div class="row" data-in="wrap">${ico(I.browser, 14)}Carousel — peek</div><div class="row" data-in="wrap">${ico(I.browser, 14)}Carousel — stack</div><div class="row" data-in="wrap">${ico(I.browser, 14)}Carousel — quotes</div></div>
 </div>
 <div class="tips">${ico(I.bulb)}${t('tips.button')}</div>

 <div class="tb"><span class="t on">${ico(I.pointer, 20)}</span><span class="t">${ico(I.hand, 20)}</span><span class="dv"></span>
  <span class="t">${ico(I.browser, 20)}</span><span class="t">${ico(I.text, 20)}</span><span class="t">${ico(I.shapes, 20)}</span><span class="t">${ico(I.image, 20)}</span>
  <span class="run">${ico(STOP_CIRCLE, 20)}${t('canvas.run.stop')}</span></div>

 <div class="chat surface">
  <div class="ch">${ico(I.bell, 18)}${ico(I.plus, 18)}</div>
  <div class="tx">
   <div class="ub"><span class="chip">${ico(I.browser, 12)}Search</span>${t('tour.scene.filtersPrompt')}</div>
   <div class="used">Edited SearchFilters.tsx</div>
   <div style="color:color(display-p3 1 1 1)">${t('tour.scene.filtersReply')}</div>
   <div class="meta">16.2s</div>
   <div class="ub" data-in="variations layouts riff wrap"><span class="chip">${ico(I.browser, 12)}Home</span>${t('tour.scene.layoutsPrompt')}</div>
   <div style="color:color(display-p3 1 1 1)" data-in="variations layouts riff wrap">${t('tour.scene.layoutsReply')}</div>
   <div class="ub" data-in="wrap"><span class="chip">${ico(I.browser, 12)}Home — grid</span>${t('tour.scene.carouselsPrompt')}</div>
   <div style="color:color(display-p3 1 1 1)" data-in="wrap">${t('tour.scene.carouselsReply')}</div>
  </div>
  <div class="comp">
   <div class="inp">
    <div data-in="chat">${t('tour.scene.layoutsPrompt')}<span class="caret"></span></div>
        <div class="muted" data-in="canvas variations layouts riff wrap">${t('chat.composer.placeholder')}</div>
   </div>
   <span class="cb" style="left:13px;top:104px">${ico(I.spark, 18)}</span><span class="cb" style="left:47px;top:104px">${ico(I.plus, 18)}</span>
   <span class="send" data-in="chat">${ico(I.arrow, 20)}</span><span class="send off" data-in="canvas variations layouts riff wrap">${ico(I.arrow, 20)}</span>
   <span class="cfb" style="left:13px">${CLAUDE_ICON}Sonnet Medium</span>
   <span class="cfb" style="left:216px">${t('chat.composer.mode.auto')}</span>
   <span class="cfb" style="left:265px;width:28px;padding:0;justify-content:center"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.5" fill="none" stroke="color(display-p3 0.2863 0.2863 0.2863)" stroke-width="2.5"/><circle cx="9" cy="9" r="6.5" fill="none" stroke="color(display-p3 0.5725 0.5725 0.5725)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="16.34 24.5" transform="rotate(-90 9 9)"/></svg></span>
  </div>
 </div>

 <div class="bar">
  <span class="lights" style="left:0;top:0"><i style="left:12px;background:color(display-p3 0.9274 0.4153 0.369)"></i><i style="left:35px;background:color(display-p3 0.9568 0.7478 0.3099)"></i><i style="left:58px;background:color(display-p3 0.3811 0.773 0.3298)"></i></span>
  <span class="ib" style="left:84px">${ico(I.projects, 20)}</span><span class="ib" style="left:121px">${ico(I.railLeft, 20)}</span>
  <div class="tab on" style="left:161px"><span class="nm">Reading app</span><span class="x">${ico(I.close, 24)}</span></div>
  <div class="tab" style="left:350px"><span class="nm">Checkout flow</span></div>
  <span class="newp" style="left:539px">${ico(I.plus, 20)}</span>
  <span class="ib" style="right:135px">${ico(I.railRight, 20)}</span>
  <span class="git">${'<span class="cell">' + GH + t('gitStatus.label.create-pr') + '</span><span class="dv"></span><span class="chev">' + ico(I.chev) + '</span>'}</span>
 </div>
</div>`;

const SCENE_HTML = BG + WIN;

/** Paint order: the backdrop, then the opening pages, then what later steps reveal. */
const rank = (cv: HTMLCanvasElement): number => (cv.dataset.art === 'backdrop' ? 0 : cv.closest('.v, .c') ? 2 : 1);

/** A still of the editor the tour pans across. */
export const TourScene = forwardRef<HTMLDivElement, { step: TourStep }>(function TourScene({ step }, ref) {
  const host = useRef<HTMLDivElement | null>(null);
  // Built once outside React so step changes never replace the painted canvases.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (!el.dataset.built) {
      el.innerHTML = SCENE_HTML;
      el.dataset.built = '1';
      el.toggleAttribute('data-intro', true);
      const refl = el.querySelector<HTMLCanvasElement>('canvas.refl');
      if (refl) paintReflection(refl);
    }
    const id = requestAnimationFrame(() => {
      [...el.querySelectorAll<HTMLCanvasElement>('canvas[data-art]:not([data-painted])')]
        .sort((x, y) => rank(x) - rank(y))
        .forEach((cv) => {
          if (paintArt(cv, cv.dataset.art ?? '')) cv.dataset.painted = '1';
        });
    });
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const out = host.current?.querySelector<HTMLElement>('.typed');
    if (!out) return;
    out.textContent = '';
    out.parentElement?.removeAttribute('data-typing');
    if (step !== 'riff') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      out.textContent = RIFF_PROMPT;
      return;
    }
    let n = 0;
    let tick: number | undefined;
    const start = window.setTimeout(() => {
      tick = window.setInterval(() => {
        n += 1;
        out.textContent = RIFF_PROMPT.slice(0, n);
        out.parentElement?.toggleAttribute('data-typing', n < RIFF_PROMPT.length);
        if (n >= RIFF_PROMPT.length) window.clearInterval(tick);
      }, 38);
    }, 1400);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(tick);
    };
  }, [step]);
  return (
    <div
      ref={(node) => {
        host.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className="ts"
      data-step={step}
      aria-hidden="true"
    />
  );
});
