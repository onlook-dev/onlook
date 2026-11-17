export const PANEL_HREF = 'studio-panel';

// A stylesheet, not inline styles: hover, focus and the current-area state are state selectors.
export const PANEL_RULES = `
.panel-shell { --panel-surface: #1f1f1f; --panel-side: #1a1a1a; --panel-raised: #262626; --panel-line: rgba(255,255,255,.08);
  --panel-line-strong: rgba(255,255,255,.12); --panel-ink: #fff; --panel-ink-2: #acacac; --panel-ink-3: #929292;
  --panel-hover: #ffffff0e; --panel-selected: #ffffff14; --panel-ease: cubic-bezier(.22, 1, .36, 1);
  display: grid; grid-template-columns: 220px 1fr; width: 100%; height: min(680px, 86vh);
  font-family: "Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; font-size: 13px; line-height: normal;
  color: var(--panel-ink); -webkit-font-smoothing: antialiased; user-select: none; -webkit-user-select: none; }
.panel-shell input { user-select: text; -webkit-user-select: text; }
.panel-shell:focus { outline: none; }
.panel-side { background: var(--panel-side); border-inline-end: var(--border-width) solid var(--panel-line); padding: 16px 8px; display: flex; flex-direction: column; }
.panel-brand { font-size: 13px; font-weight: 500; padding: 4px 8px 12px; }
.panel-nav { display: flex; flex-direction: column; gap: 2px; }
.panel-nav-item { all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 8px; width: 100%; height: 28px; padding: 0 8px;
  border-radius: 6px; font-size: 13px; color: var(--panel-ink-2); cursor: pointer; }
.panel-nav-item:hover { background: var(--panel-hover); color: var(--panel-ink); }
.panel-nav-item[aria-current='page'] { background: var(--panel-selected); color: var(--panel-ink); }
.panel-nav-item:focus-visible { outline: 2px solid var(--color-accent); }
.panel-nav-item svg { width: 15px; height: 15px; flex: none; }
.panel-foot { margin-top: auto; padding: 8px 8px 0; font-size: 11px; color: var(--panel-ink-3); line-height: 1.5;
  display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.panel-main { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--panel-surface); }
.panel-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px 12px; }
.panel-title { font-size: 19px; font-weight: 500; margin: 0; line-height: normal; }
.panel-content { flex: 1; min-height: 0; overflow-y: auto; padding: 0 24px 24px; scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,.18) transparent; user-select: text; -webkit-user-select: text; }
.panel-shell { animation: panel-rise .45s var(--panel-ease); }
@keyframes panel-rise { from { opacity: 0; transform: translateY(2%) scale(.98) } }
@media (prefers-reduced-motion: reduce) {
  .panel-shell { animation: none; }
}
`;
