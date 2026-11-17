// Every value here is derived, not chosen — the OKLCH/HCT stops, per-hue sources and
// chroma table are in `REGISTER.md` §21.
import {defineTheme, defineSyntaxTheme} from '@astryxdesign/core/theme';

const neutralSyntax = defineSyntaxTheme({
  name: 'xds-neutral',
  tokens: {
    keyword: ['#700084', '#efa8ff'],
    string: ['#005600', '#a6d2a2'],
    comment: ['#737373', '#a3a3a3'],
    number: ['#6e3500', '#ffb37f'],
    function: ['#00458c', '#a0caff'],
    type: ['#700084', '#efa8ff'],
    variable: ['#171717', '#e5e5e5'],
    operator: ['#737373', '#a3a3a3'],
    constant: ['#6e3500', '#ffb37f'],
    tag: ['#89001a', '#ffaeaa'],
    attribute: ['#584400', '#eec12f'],
    property: ['#005348', '#83dac9'],
    punctuation: ['#a3a3a3', '#525252'],
    background: ['#fafafa', '#0a0a0a'],
  },
});

export const neutralTheme = defineTheme({
  name: 'neutral',

  typography: {
    scale: {base: 14, ratio: 1.2},
    body: {
      family: 'Figtree',
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      family: 'Figtree',
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      weights: {3: 'bold', 4: 'bold'},
    },
    code: {
      family: 'ui-monospace',
      fallbacks:
        '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },

  motion: {fast: 125, medium: 300, slow: 700, ratio: 0.75},

  syntax: neutralSyntax,

  tokens: {
    '--color-background-surface': ['#ffffff', '#262626'],
    '--color-background-body': ['#f1f1f1', '#1b1b1b'],
    '--color-background-card': ['#ffffff', '#1b1b1b'],
    '--color-background-popover': ['#ffffff', '#1b1b1b'],
    '--color-background-muted': ['#f1f1f1', '#1b1b1b'],

    '--color-accent': ['#262626', '#ebebeb'],
    '--color-accent-muted': ['#f1f1f1', '#262626'],
    '--color-neutral': ['#0000000F', '#FFFFFF1A'],

    '--color-overlay': ['#00000080', '#000000CC'],
    '--color-overlay-hover': ['#0000000D', '#FFFFFF0D'],
    '--color-overlay-pressed': ['#0000001A', '#FFFFFF1A'],

    '--color-text-primary': ['#171717', '#fafafa'],
    '--color-text-secondary': ['#737373', '#a3a3a3'],
    '--color-text-disabled': ['#a3a3a3', '#525252'],
    '--color-text-accent': ['#262626', '#ebebeb'],
    '--color-on-dark': '#ffffff',
    '--color-on-light': '#171717',
    '--color-on-accent': ['#ffffff', '#171717'],
    '--color-on-success': ['#ffffff', '#171717'],
    '--color-on-error': ['#ffffff', '#171717'],
    '--color-on-warning': '#171717',

    '--color-icon-accent': ['#262626', '#ebebeb'],
    '--color-icon-primary': ['#171717', '#fafafa'],
    '--color-icon-secondary': ['#737373', '#a3a3a3'],
    '--color-icon-disabled': ['#a3a3a3', '#525252'],

    '--color-success': ['#007004', '#9fe59b'],
    '--color-error': ['#a50c25', '#ffc6c1'],
    '--color-warning': ['#745b00', '#fdcf4f'],
    '--color-success-muted': ['#c5e5c0', '#84c9803D'],
    '--color-error-muted': ['#facecb', '#ff9e973D'],
    '--color-warning-muted': ['#f8da9d', '#deb4333D'],

    '--color-border': ['#00000014', '#FFFFFF1A'],
    '--color-border-emphasized': ['#d4d4d4', '#525252'],

    '--color-skeleton': ['#ebebeb', '#525252'],
    '--color-shadow': ['#0000001A', '#0000004D'],
    '--color-tint-hover': ['black', 'white'],

    '--color-background-red': ['#facecb', '#ff9e973D'],
    '--color-border-red': ['#e6bab8', '#ff6f6c'],
    '--color-icon-red': ['#89001a', '#ff9e97'],
    '--color-text-red': ['#89001a', '#ffc6c1'],

    '--color-background-orange': ['#fad0b5', '#ffa2583D'],
    '--color-border-orange': ['#e6bda2', '#e2883e'],
    '--color-icon-orange': ['#6e3500', '#ffa258'],
    '--color-text-orange': ['#6e3500', '#ffc9a2'],

    '--color-background-yellow': ['#f8da9d', '#deb4333D'],
    '--color-border-yellow': ['#e4c279', '#c0990e'],
    '--color-icon-yellow': ['#584400', '#deb433'],
    '--color-text-yellow': ['#584400', '#fdcf4f'],

    '--color-background-green': ['#c5e5c0', '#84c9803D'],
    '--color-border-green': ['#b2d1ac', '#69ad67'],
    '--color-icon-green': ['#0c5700', '#84c980'],
    '--color-text-green': ['#0c5700', '#9fe59b'],

    '--color-background-teal': ['#a5e3d6', '#7ec6b83D'],
    '--color-border-teal': ['#94d6c8', '#63ab9d'],
    '--color-icon-teal': ['#005348', '#7ec6b8'],
    '--color-text-teal': ['#005348', '#99e2d3'],

    '--color-background-cyan': ['#a3e0ef', '#83c2d43D'],
    '--color-border-cyan': ['#91d3e3', '#67a7b8'],
    '--color-icon-cyan': ['#00505f', '#83c2d4'],
    '--color-text-cyan': ['#00505f', '#9edef0'],

    '--color-background-blue': ['#c4ddfb', '#9eb7ff3D'],
    '--color-border-blue': ['#b1c9e7', '#6d9cfe'],
    '--color-icon-blue': ['#00458c', '#9eb7ff'],
    '--color-text-blue': ['#00458c', '#c7d3ff'],

    '--color-background-purple': ['#eccef3', '#f297ff3D'],
    '--color-border-purple': ['#d8bbdf', '#dd74f0'],
    '--color-icon-purple': ['#700084', '#f297ff'],
    '--color-text-purple': ['#700084', '#fac1ff'],

    '--color-background-pink': ['#fccadc', '#ff99c33D'],
    '--color-border-pink': ['#e7b7c8', '#f273aa'],
    '--color-icon-pink': ['#83004b', '#ff99c3'],
    '--color-text-pink': ['#83004b', '#ffc3da'],

    // Dark gray is a translucent wash, not a solid tone: a solid one is
    // indistinguishable from `--color-background-muted`.
    '--color-background-gray': ['#e5e5e5', 'var(--color-neutral)'],
    '--color-border-gray': ['#d4d4d4', '#262626'],
    '--color-icon-gray': ['#525252', '#a3a3a3'],
    '--color-text-gray': ['#262626', '#e5e5e5'],

    '--radius-none': '0.25rem',
    '--radius-inner': '0.375rem',
    '--radius-element': '0.625rem',
    '--radius-container': '0.75rem',
    '--radius-page': '1.75rem',
    '--radius-full': '9999px',

    '--shadow-low':
      '0 2px 4px light-dark(oklch(0 0 0 / 5%), oklch(0 0 0 / 25%)), ' +
      '0 4px 8px light-dark(oklch(0 0 0 / 10%), oklch(0 0 0 / 40%)), ' +
      'inset 0 0 0 1px light-dark(transparent, oklch(1 0 0 / 8%))',
    '--shadow-med':
      '0 2px 4px light-dark(oklch(0 0 0 / 5%), oklch(0 0 0 / 35%)), ' +
      '0 4px 12px light-dark(oklch(0 0 0 / 10%), oklch(0 0 0 / 50%)), ' +
      'inset 0 0 0 1px light-dark(transparent, oklch(1 0 0 / 12%))',
    '--shadow-high':
      '0 4px 6px light-dark(oklch(0 0 0 / 10%), oklch(0 0 0 / 50%)), ' +
      '0 12px 24px light-dark(oklch(0 0 0 / 15%), oklch(0 0 0 / 70%)), ' +
      'inset 0 0 0 1px light-dark(transparent, oklch(1 0 0 / 15%))',
    '--shadow-inset-hover': 'inset 0px 0px 0px 2px #0074e24D',
    '--shadow-inset-selected': 'inset 0px 0px 0px 2px #0074e280',
    '--shadow-inset-success': 'inset 0px 0px 0px 2px #1981004D',
    '--shadow-inset-warning': 'inset 0px 0px 0px 2px #ffce2f4D',
    '--shadow-inset-error': 'inset 0px 0px 0px 2px #e33f4a4D',
  },

  components: {
    // The semantic variants below are literal hex, so a downstream theme cannot
    // re-point them by token — it has to displace them at the call site.
    badge: {
      'variant:info': {
        backgroundColor: 'light-dark(#0074e2, #6d9cfe)',
        color: 'light-dark(#ffffff, #171717)',
      },
      'variant:neutral': {
        backgroundColor: 'var(--color-background-gray)',
        color: 'var(--color-text-gray)',
      },
      'variant:success': {
        backgroundColor: 'light-dark(#198100, #64af4c)',
        color: 'light-dark(#ffffff, #171717)',
      },
      'variant:warning': {
        // Dark text in both modes: white on this yellow fails AA-large.
        backgroundColor: '#ffce2f',
        color: '#171717',
      },
      'variant:error': {
        backgroundColor: 'light-dark(#e33f4a, #ff705d)',
        color: 'light-dark(#ffffff, #171717)',
      },

      'variant:red': {
        backgroundColor: 'var(--color-background-red)',
        color: 'var(--color-text-red)',
      },
      'variant:orange': {
        backgroundColor: 'var(--color-background-orange)',
        color: 'var(--color-text-orange)',
      },
      'variant:yellow': {
        backgroundColor: 'var(--color-background-yellow)',
        color: 'var(--color-text-yellow)',
      },
      'variant:green': {
        backgroundColor: 'var(--color-background-green)',
        color: 'var(--color-text-green)',
      },
      'variant:teal': {
        backgroundColor: 'var(--color-background-teal)',
        color: 'var(--color-text-teal)',
      },
      'variant:cyan': {
        backgroundColor: 'var(--color-background-cyan)',
        color: 'var(--color-text-cyan)',
      },
      'variant:blue': {
        backgroundColor: 'var(--color-background-blue)',
        color: 'var(--color-text-blue)',
      },
      'variant:purple': {
        backgroundColor: 'var(--color-background-purple)',
        color: 'var(--color-text-purple)',
      },
      'variant:pink': {
        backgroundColor: 'var(--color-background-pink)',
        color: 'var(--color-text-pink)',
      },
      'variant:gray': {
        backgroundColor: 'var(--color-background-gray)',
        color: 'var(--color-text-gray)',
      },
    },

    // `variant:neutral` is left off on purpose: the neutral badge ground is
    // near-invisible at 8px, so the dot keeps the component's own mid-gray.
    statusdot: {
      'variant:success': {backgroundColor: 'light-dark(#198100, #64af4c)'},
      'variant:warning': {backgroundColor: '#ffce2f'},
      'variant:error': {backgroundColor: 'light-dark(#e33f4a, #ff705d)'},
      'variant:accent': {backgroundColor: 'light-dark(#0074e2, #6d9cfe)'},
    },

    // Each status writes TWO classes (`.astryx-banner.error`), so a downstream
    // theme's one-class `base` rule loses to these on specificity.
    banner: {
      'status:info': {
        backgroundColor: 'var(--color-background-blue)',
        '--color-accent-muted': 'transparent',
        '--color-text-primary': 'var(--color-text-blue)',
        '--color-text-secondary': 'var(--color-text-blue)',
        '--color-accent': 'var(--color-text-blue)',
      },
      'status:success': {
        '--color-text-primary': 'var(--color-text-green)',
        '--color-text-secondary': 'var(--color-text-green)',
        '--color-success': 'var(--color-text-green)',
      },
      'status:warning': {
        '--color-text-primary': 'var(--color-text-yellow)',
        '--color-text-secondary': 'var(--color-text-yellow)',
        '--color-warning': 'var(--color-text-yellow)',
      },
      'status:error': {
        '--color-text-primary': 'var(--color-text-red)',
        '--color-text-secondary': 'var(--color-text-red)',
        '--color-error': 'var(--color-text-red)',
      },
    },

    // No `textinput` per-status entry on purpose: the global
    // `--color-{success,error,warning}` clear AA non-text 3:1 on both surfaces
    // its border and icon touch.
    switch: {
      base: {
        '--color-background-gray': 'var(--color-border-emphasized)',
      },
    },

    progressbar: {
      base: {
        '--color-background-muted': 'var(--color-border-emphasized)',
      },
      'variant:accent': {
        '--color-accent': '#0074e2',
      },
      'variant:success': {
        '--color-success': '#198100',
      },
      'variant:warning': {
        '--color-warning': '#ffce2f',
      },
      'variant:error': {
        '--color-error': '#e33f4a',
      },
    },

    card: {
      base: {
        padding: 'var(--spacing-3)',
      },
    },

    section: {
      base: {
        padding: 'var(--spacing-3)',
      },
    },
  },

  // No `icons:` entry: Studio applies themes on the CSS-only path and never
  // consults it, while the `lucide-react` import it forces breaks
  // `astryx theme build` (ONL-1803).
});
