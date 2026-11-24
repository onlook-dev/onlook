import { LAYER } from '../overlay/layers.js';

export const TIPS_HREF = 'studio-tips';

// A stylesheet, not inline styles: hover, focus and the arrow's reveal are state selectors.
export const TIPS_RULES = `
.tips-search { display: flex; align-items: center; gap: 8px; width: 200px; height: 28px; padding: 0 8px; background: var(--panel-side);
  border: var(--border-width) solid var(--panel-line); border-radius: 6px; color: var(--panel-ink-3); }
.tips-search:focus-within { border-color: var(--color-accent); }
.tips-search input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: var(--panel-ink); font: inherit; font-size: 13px; }
.tips-search input::placeholder { color: var(--panel-ink-3); }
.tips-tabs { display: flex; gap: 2px; padding: 0 24px 12px; border-bottom: var(--border-width) solid var(--panel-line); }
.tips-tab { all: unset; box-sizing: border-box; height: 26px; padding: 0 10px; border-radius: 6px; font-size: 13px; line-height: 26px;
  color: var(--panel-ink-2); cursor: pointer; }
.tips-tab:hover { color: var(--panel-ink); background: var(--panel-hover); }
.tips-tab[aria-selected='true'] { background: var(--panel-selected); color: var(--panel-ink); }
.tips-tab:focus-visible { outline: 2px solid var(--color-accent); }
.tips-grid { flex: 1; overflow-y: auto; padding: 20px 24px 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px 16px; align-content: start; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.18) transparent; }
.tips-card { all: unset; box-sizing: border-box; display: flex; flex-direction: column; padding: 6px; margin: -6px; cursor: pointer; border-radius: 8px; }
.tips-card:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.tips-card .tips-tile { cursor: zoom-in; }
.tips-card:hover .tips-tile { border-color: var(--panel-line-strong); }
.tips-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; padding: 0 2px; }
.tips-card-title { font-size: 13px; font-weight: 500; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tips-card-arrow { flex: none; margin-inline-end: -2px; color: var(--panel-ink-3); opacity: 0; }
.tips-card:hover .tips-card-arrow, .tips-card:focus-visible .tips-card-arrow { opacity: 1; }
.tips-empty { grid-column: 1 / -1; padding: 60px 0; text-align: center; color: var(--panel-ink-3); font-size: 13px; }
.tips-detail { position: absolute; inset: 0; z-index: ${LAYER.over}; display: flex; flex-direction: column; gap: 12px; padding: 18px 24px 24px;
  overflow-y: auto; scrollbar-width: thin; background: var(--panel-surface); }
.tips-back { all: unset; align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; margin-inline-start: -2px;
  padding: 4px 6px 4px 2px; border-radius: 6px; font-size: 13px; color: var(--panel-ink-2); cursor: pointer; }
.tips-back:hover { color: var(--panel-ink); }
.tips-back:focus-visible { outline: 2px solid var(--color-accent); }
.tips-stage { all: unset; box-sizing: border-box; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; position: relative; cursor: zoom-out; }
.tips-stage:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; border-radius: 8px; }
.tips-stage .tips-tile { width: 100%; flex: none; aspect-ratio: 16 / 8; transform-origin: 0 0; }
.tips-band { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding-top: 8px; }
.tips-band-info { display: flex; flex-direction: column; }
.tips-band-act { display: flex; flex-direction: column; gap: 6px; }
.tips-cat { font-size: 12px; color: var(--panel-ink-3); margin: 0 0 4px; }
.tips-detail-title { font-size: 19px; font-weight: 500; margin: 0 0 8px; line-height: normal; }
.tips-body { font-size: 13px; color: var(--panel-ink-2); line-height: 1.54; margin: 0; }
.tips-try-label { font-size: 12px; font-weight: 500; color: var(--panel-ink-3); }
.tips-try { all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 10px; width: 100%; min-height: 32px; padding: 6px 10px;
  border: var(--border-width) solid var(--panel-line); border-radius: 6px; line-height: 1.4; font-size: 13px; cursor: pointer; }
.tips-try:hover { border-color: var(--panel-line-strong); background: var(--panel-hover); }
.tips-try:focus-visible { outline: 2px solid var(--color-accent); }
.tips-try span { flex: 1; }
.tips-try svg { color: var(--panel-ink-3); }
.tips-try:hover svg { color: var(--panel-ink); }
.tips-primary { all: unset; box-sizing: border-box; margin-top: 10px; height: 32px; border-radius: 6px; text-align: center; line-height: 32px;
  background: #fff; color: #000; font-weight: 500; font-size: 13px; cursor: pointer; }
.tips-primary:hover { background: #e6e6e6; }
.tips-primary:active { transform: scale(.98); }
.tips-primary:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.tips-keys { flex: 1; overflow-y: auto; padding: 8px 24px; scrollbar-width: thin; }
.tips-key-columns { columns: 2; column-gap: 40px; }
.tips-key-group { break-inside: avoid; margin: 0 0 20px; padding-top: 8px; }
.tips-key-group h3 { font-size: 12px; font-weight: 500; color: var(--panel-ink-3); margin: 0 0 4px; }
.tips-key-row { display: flex; align-items: center; justify-content: space-between; height: 36px; border-bottom: var(--border-width) solid var(--panel-line);
  font-size: 13px; color: var(--panel-ink); }
.tips-key-row:last-child { border-bottom: 0; }
.tips-key-label { display: flex; align-items: center; gap: 8px; }
.tips-key-label svg { color: var(--panel-ink-3); flex: none; }
.tips-key-combo { display: flex; align-items: center; gap: 6px; color: var(--panel-ink-3); font-size: 12px; }
.tips-key-combo > span { display: flex; align-items: center; gap: 3px; }
.tips-key-word { margin-inline-start: 4px; }
.tips-kbd { min-width: 22px; height: 22px; padding: 0 6px; display: inline-flex; align-items: center; justify-content: center; border-radius: 5px;
  background: var(--panel-raised); border: var(--border-width) solid var(--panel-line-strong); border-bottom-width: 2px; box-sizing: border-box;
  font: inherit; font-size: 12px; font-weight: 500; color: var(--panel-ink-2); }
.tips-card { animation: tips-card-in .5s var(--panel-ease) both; }
.tips-card:nth-child(2) { animation-delay: .04s } .tips-card:nth-child(3) { animation-delay: .08s }
.tips-card:nth-child(4) { animation-delay: .12s } .tips-card:nth-child(5) { animation-delay: .16s }
.tips-card:nth-child(6) { animation-delay: .2s } .tips-card:nth-child(7) { animation-delay: .24s } .tips-card:nth-child(8) { animation-delay: .28s }
.tips-key-group { animation: tips-card-in .4s var(--panel-ease) both; }
.tips-key-group:nth-child(2) { animation-delay: .04s } .tips-key-group:nth-child(3) { animation-delay: .08s }
.tips-key-group:nth-child(4) { animation-delay: .12s } .tips-key-group:nth-child(5) { animation-delay: .16s }
@keyframes tips-card-in { from { opacity: 0; transform: translateY(8px) } }
@media (prefers-reduced-motion: reduce) {
  .tips-card, .tips-key-group { animation: none; }
}
.tips-toast-lane { position: absolute; top: 0; left: 0; right: 0; overflow: hidden; pointer-events: none; z-index: ${LAYER.raised};
  display: flex; justify-content: center; }
.tips-toast { user-select: none; height: fit-content; max-width: 60%; padding: 8px 12px; border-radius: 8px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; background: #1f1f1f; color: #fff; border: var(--border-width) solid rgba(255,255,255,.12);
  font-size: 13px; box-shadow: 0 10px 30px rgba(0,0,0,.4); animation: tips-toast 2.8s cubic-bezier(.22, 1, .36, 1) forwards; }
@keyframes tips-toast {
  0% { transform: translateY(calc(-100% - 12px)) }
  14%, 84% { transform: none }
  100% { transform: translateY(calc(-100% - 12px)) }
}
@media (prefers-reduced-motion: reduce) {
  .tips-toast { animation: tips-toast-fade 2.8s linear forwards; }
  @keyframes tips-toast-fade { 0%, 90% { opacity: 1 } 100% { opacity: 0 } }
}
`;
