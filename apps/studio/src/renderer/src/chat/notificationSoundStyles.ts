import { LAYER } from '../overlay/layers.js';

export const NOTIFICATION_SOUND_HREF = 'studio-sound-picker';

export const NOTIFICATION_SOUND_RULES = `
.sound-picker { --sound-picker-accent: var(--color-on-dark); color: var(--color-text-primary); font-size: var(--font-size-base); }
.sound-picker-head { margin-bottom: 20px; }
.sound-picker-head h2 { margin: 0; font-size: var(--font-size-xl); font-weight: 500; line-height: 1.5; }
.sound-picker-head p { margin: 4px 0 0; color: var(--color-text-secondary); line-height: 1.538; }

.sound-picker-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
.sound-picker-grid[data-muted='true'] { opacity: 0.4; }
/* Held, not silenced: the cards go out of reach for the length of the write, which the deeper muted dim already owns. */
.sound-picker[aria-busy='true'] .sound-picker-grid[data-muted='false'] { opacity: 0.6; }

.sound-picker-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; padding: 16px; text-align: center; border: var(--border-width) solid var(--color-border); border-radius: var(--radius-page); background: var(--color-background-muted); }
/* Hover lifts without borrowing the accent: the accent is selection's alone (ONL-2084). */
.sound-picker-grid[data-muted='false'] .sound-picker-card:hover { border-color: var(--color-border-emphasized); }
/* No outer glow and no moving flare: the selected card read as obnoxious with them (ONL-2084). */
.sound-picker-card[data-selected='true'] { border-color: color-mix(in oklch, var(--sound-picker-accent) 40%, transparent); background: color-mix(in oklch, var(--sound-picker-accent) 8%, var(--color-background-muted)); }

/* The ported card suppresses its own outline and replaces it with nothing; without this a keyboard shows no card at all. */
.sound-picker :is(button):focus-visible { outline: 2px solid var(--sound-picker-accent); outline-offset: 2px; }
/* The select's own box is its label and wave only, so its ring is drawn on the card-sized target below. */
.sound-picker-select:focus-visible { outline: none; }
.sound-picker-select:focus-visible::after { outline: 2px solid var(--sound-picker-accent); outline-offset: 2px; }

/* Static, so the stretched target below resolves against the card and not against this button. */
.sound-picker-select { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; padding: 0; color: inherit; font: inherit; text-align: center; border: 0; background: none; cursor: pointer; }
.sound-picker-select::after { content: ''; position: absolute; inset: 0; z-index: ${LAYER.raised}; border-radius: var(--radius-page); }
.sound-picker-select:disabled { cursor: default; }
.sound-picker-play { position: relative; z-index: ${LAYER.over}; display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: var(--radius-page); color: var(--color-icon-secondary); background: var(--color-background-gray); cursor: pointer; }
.sound-picker-play:disabled { cursor: default; }
.sound-picker-grid[data-muted='false'] .sound-picker-card:hover .sound-picker-play { color: var(--color-icon-primary); }
.sound-picker-card[data-selected='true'] .sound-picker-play { color: var(--sound-picker-accent); }
.sound-picker-name { margin-bottom: 16px; font-size: var(--font-size-base); font-weight: 500; }
.sound-picker-card[data-selected='true'] .sound-picker-name { color: var(--sound-picker-accent); }

.sound-picker-wave { display: flex; width: 100%; align-items: flex-end; justify-content: space-between; height: 16px; }
.sound-picker-bar { width: 3px; border-radius: var(--radius-full); background: var(--color-icon-secondary); opacity: 0.4; }
.sound-picker-grid[data-muted='false'] .sound-picker-card:hover .sound-picker-bar { opacity: 0.7; }
.sound-picker-card[data-selected='true'] .sound-picker-bar { background: var(--sound-picker-accent); opacity: 1; }

.sound-picker-error { margin: 0 0 12px; color: var(--color-error); font-size: var(--font-size-sm); line-height: 1.5; }
`;
