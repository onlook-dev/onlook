/**
 * Dark only: every token is a single value, never a [light, dark] tuple; the app pins `data-astryx-media="dark"`.
 * No `color:` block: at 0.1.9 `expandColorScale` builds the neutrals on the accent's hue and emits `light-dark()` pairs, which follow the OS appearance (REGISTER.md §6).
 * `REGISTER.md` lists the values that do not trace to the design file.
 */

import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from './neutralTheme';

/** Secondary ink re-points at the icon ladder's #929292; a literal would stop tracking the root. */
const STUDIO_BANNER_INK = {
  '--color-text-primary': 'var(--color-on-dark)',
  '--color-text-secondary': 'var(--color-icon-secondary)',
} as const;

/** `TokenName` omits `--border-width` at 0.1.9; the theme emitter writes any key. */
const HAIRLINE_TOKENS = {'--border-width': '0.5px'} as Record<string, string>;

export const studioTheme = defineTheme({
  name: 'studio',
  extends: neutralTheme,

  /** Anchored on the ratio: no size is hand-pinned, and leading stays Astryx's `computeLeading` (REGISTER.md §1, §7.1). */
  typography: {
    scale: {base: 13, ratio: 1.125},
    body: {
      family: 'Inter Variable',
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      family: 'Inter Variable',
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      weight: 'medium',
    },
    /**
     * JetBrains Mono is bundled; a stack naming `ui-monospace` or "SF Mono" degrades silently to Menlo (REGISTER.md §8.1).
     * ⚠ The family is 'JetBrains Mono Variable', never 'JetBrains Mono': a wrong name falls through to the next fallback with nothing in the console or the build.
     * Its loading is in `src/renderer/src/styles.css`; delete either half and the app silently falls back.
     */
    code: {
      family: 'JetBrains Mono Variable',
      fallbacks: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },

  /** Anchored so `--radius-element` lands on the design's 4px. The ramp is fixed-proportion, so container and page are overridden in `tokens` (REGISTER.md §2). */
  radius: {base: 4, multiplier: 0.5},

  tokens: {
    '--radius-container': '8px',
    '--radius-page': '12px',
    '--radius-chat': '8px',

    // The grounds sit close together on purpose: hairlines separate surfaces, not tone (REGISTER.md §4).
    '--color-background-body': '#000000',
    /** Translucent on purpose. Astryx has no blur token, so each component applies the `backdrop-filter` half (REGISTER.md §4). */
    '--color-background-surface': '#000000D9',
    '--color-background-muted': '#1a1a1a',
    '--color-background-card': '#1f1f1f',
    '--color-background-popover': '#1f1f1f',
    '--color-background-inverted': '#ffffff',

    '--color-accent': 'var(--color-on-dark)',
    /** The design's `bg/active` #333333 — the same solid ToggleButton's pressed state uses. */
    '--color-accent-muted': 'var(--color-background-gray)',
    '--color-on-accent': '#000000',
    '--color-text-accent': 'var(--color-text-primary)',
    '--color-icon-accent': 'var(--color-icon-primary)',

    // The only status token set: `--color-error-muted` and the `-red` family keep the base theme's values (REGISTER.md §3).
    '--color-error': '#f66',

    // `--color-text-gray` carries the design's tertiary tier (#929292, the chat transcript): `TokenName` is a closed union with no neutral slot for it (REGISTER.md §3).
    '--color-text-primary': '#ffffff',
    '--color-text-secondary': '#acacac',
    '--color-text-disabled': '#606060',
    '--color-icon-primary': '#ffffff',
    '--color-icon-secondary': '#929292',
    '--color-icon-disabled': '#606060',
    '--color-on-dark': '#ffffff',
    '--color-on-light': '#000000',

    // `--border-width` is in `HAIRLINE_TOKENS`: `TokenName` omits it at 0.1.9.
    '--color-border': '#494949',
    /** Filled blank — #606060 is the next rung up the design's own achromatic
     *  ladder. Registered. */
    '--color-border-emphasized': '#606060',

    /** Derived: white at this alpha over `bg/primary` #1a1a1a lands on `bg/active` #333333 (REGISTER.md §3). */
    '--color-overlay-pressed': '#FFFFFF1C',
    /** Filled blank — half the pressed wash. Registered. */
    '--color-overlay-hover': '#FFFFFF0E',
    /** Filled blank — no modal or scrim exists in the file. Registered. */
    '--color-overlay': '#000000CC',
    '--color-neutral': '#FFFFFF0D',
    '--color-tint-hover': '#FFFFFF0A',
    /** Not #1f1f1f — that is the card ground, and a fill equal to its ground is invisible (see `--color-background-gray`). Registered. */
    '--color-skeleton': '#333333',
    '--color-track': '#333333',
    /** `Base Surface`'s drop-shadow colour, #00000080 (alpha 128/255). */
    '--color-shadow': '#00000080',

    // Only teal, blue and gray are set; the other hues and the status palette stay inherited (REGISTER.md §3).
    // `--color-background-blue` also feeds the artifact accent (`--studio-blue-fill`, styles.css).
    // The code view's syntax palette is `--studio-syntax-*` in styles.css: the token map is a closed union (ONL-2563, REGISTER.md §25).
    '--color-background-teal': '#004036',
    '--color-text-teal': '#00deba',
    '--color-border-teal': '#00deba',
    '--color-icon-teal': '#00deba',
    '--color-background-blue': '#002a48',
    '--color-text-blue': '#90d1ff',
    '--color-border-blue': '#90d1ff',
    '--color-icon-blue': '#90d1ff',
    /*
     * #333333, not the design's `bg/secondary` #1f1f1f: that equals `--color-background-card`, and a neutral Badge on a Card would be invisible (REGISTER.md §3).
     * The chip moves, not the card: card is load-bearing for panels and popovers too.
     */
    '--color-background-gray': '#333333',
    '--color-text-gray': '#929292',

    '--color-border-gray': '#494949',
    '--color-icon-gray': '#929292',

    // A design-tool effect radius maps 1:1 to `box-shadow` and ÷2 to `drop-shadow()` and backdrop blur; both tokens here are box-shadows (REGISTER.md §4).
    /** `Soft shadow` = DROP_SHADOW #0000001A, offset (0,2), radius 5. */
    '--shadow-low': '0 2px 5px #0000001A',
    /** `Base Surface` = DROP_SHADOW #00000080, offset (0,4), radius 10. */
    '--shadow-med': '0 4px 10px #00000080',
    /** Filled blank — the design has no third elevation. Registered. */
    '--shadow-high': '0 8px 20px #00000080',
    /** Transparent, not `none`: these compose into multi-shadow lists, where a literal `none` invalidates the whole declaration (REGISTER.md §3). */
    '--shadow-inset-hover': 'inset 0 0 0 0.5px transparent',
    '--shadow-inset-selected': 'inset 0 0 0 0.5px transparent',
    ...HAIRLINE_TOKENS,
  },

  /**
   * No inverted surface: both blocks keep the content in the app's dark palette and let every other token inherit (REGISTER.md §16).
   * `--color-accent` is re-pointed because core's default collapses it to the on-colour, a black focus ring on a dark ground.
   */
  onLight: {
    tokens: {
      'color-scheme': 'dark',
      '--color-text-primary': 'var(--color-on-dark)',
      '--color-icon-primary': 'var(--color-on-dark)',
      '--color-accent': 'var(--color-text-accent)',
    },
  },

  onDark: {
    tokens: {
      '--color-accent': 'var(--color-text-accent)',
    },
  },

  /**
   * Appearance only: band heights and measures belong to the layout (REGISTER.md §11).
   * A key builds `.astryx-${key}` verbatim, with the suffix from `parseStyleKey()` (`base` → none, `variant:x` → `.x`, a bare `selected` → `.selected`).
   * The build's validator neither confirms nor denies a key; read the computed value.
   */
  components: {
    /** Every modal is the popover gray: the translucent surface has no blur behind a dialog and read as black. */
    dialog: {
      base: {
        backgroundColor: 'var(--color-background-popover)',
        '--color-background-surface': 'var(--color-background-popover)',
        boxShadow: 'inset 0 0 0 var(--border-width) var(--color-border), 0 8px 20px rgba(0, 0, 0, 0.5)',
      },
    },
    /** `LayoutHeader`/`LayoutFooter`/`LayoutPanel` hardcode a 1px divider instead of reading `--border-width`. */
    'layout-header': {base: {borderBlockEndWidth: 'var(--border-width)'}},
    'layout-footer': {base: {borderBlockStartWidth: 'var(--border-width)'}},
    'layout-panel': {
      base: {
        borderInlineStartWidth: 'var(--border-width)',
        borderInlineEndWidth: 'var(--border-width)',
      },
    },
    /** SideNav ships `width: 260px`, which overflows the slot the frame budgets and drags every row's inset with it. */
    'side-nav': {
      base: {
        width: '100%',
        maxWidth: '100%',
        backgroundColor: 'var(--color-background-surface)',
      },
    },
    /** `--studio-on-accent-muted` lives in `renderer/src/styles.css`: `TokenName` has no `--color-on-accent-muted` slot at 0.1.9. */
    'side-nav-item': {
      base: {borderRadius: 'var(--radius-element)'},
      selected: {
        backgroundColor: 'var(--color-accent-muted)',
        color: 'var(--studio-on-accent-muted)',
      },
    },
    /**
     * An override re-points a variant at a token and never restates a token's value: a hex here ignores a later token change and nothing errors (REGISTER.md §3).
     * `badge`'s `info` is the exception: its base value is a literal `light-dark()` that no token reaches.
     */
    /**
     * Every Banner state takes the app's own surface and foreground; `status` still selects `role` (REGISTER.md §28).
     * ⚠️ REACH: every Banner in the app, on purpose. It does not reach the transcript's error ink (`--color-error` in `chat-layout`).
     */
    banner: {
      base: {
        '--color-error-muted': 'var(--color-background-popover)',
        '--color-warning-muted': 'var(--color-background-popover)',
        '--color-success-muted': 'var(--color-background-popover)',
        '--color-accent-muted': 'var(--color-background-popover)',
      },
      /*
       * ⚠️ The ink needs the variant, not `base`: `neutralTheme` writes the two-class `.astryx-banner.error`, which beats a one-class `base` rule.
       * `info` also sets `background-color` outright, so its ground is restated.
       */
      'status:error': STUDIO_BANNER_INK,
      'status:warning': STUDIO_BANNER_INK,
      'status:success': STUDIO_BANNER_INK,
      'status:info': {
        ...STUDIO_BANNER_INK,
        backgroundColor: 'var(--color-background-popover)',
      },
    },

    /** Core colours the status glyph from `--color-error` / `-warning` / `-success` / `-accent`; without this the slab is neutral and the glyph stays red. */
    'banner-icon': {
      base: {
        '--color-error': 'var(--color-icon-primary)',
        '--color-warning': 'var(--color-icon-primary)',
        '--color-success': 'var(--color-icon-primary)',
        '--color-accent': 'var(--color-icon-primary)',
      },
    },

    badge: {
      'variant:info': {
        backgroundColor: 'var(--color-background-blue)',
        color: 'var(--color-text-blue)',
      },
    },
    /**
     * ⚠️ The composer's geometry vars are unreachable from a theme at 0.1.9, so no chat entry below sets `borderRadius` or `padding`.
     * `astryx theme build` hard-errors on any `--_*` key, `chat:` emits onto a selector nothing carries, and `chat-composer:` puts `border-radius` on the root while the radius lives on an inner div.
     * The composer's 12px inset is `density`'s default, `balanced` (`packages/chat-ui/src/ChatPanel.tsx`).
     */
    /**
     * The chat panel is monochrome; colour is opt-in (REGISTER.md §28).
     * Scoped on `.astryx-chat-layout`, so the re-points reach every Astryx component inside the panel and nothing outside it. `--color-on-accent` moves with `--color-accent`.
     * ⚠️ WHAT THIS CANNOT REACH: Astryx compiles the `warning` and `error` Badge variants to a literal `background-color`. Nothing in the chat picks either (ONL-1939); a fix belongs at the call site that does, never in `components.badge`, which is global.
     */
    'chat-layout': {
      base: {
        '--color-accent': 'var(--color-background-gray)',
        '--color-on-accent': 'var(--color-text-primary)',
        /* The accent is four slots: `--color-text-accent` and `--color-icon-accent` do not follow `--color-accent`. */
        '--color-text-accent': 'var(--color-text-primary)',
        '--color-icon-accent': 'var(--color-icon-primary)',
        '--color-success': 'var(--color-text-secondary)',
        /* `--color-error` is not re-pointed: failure keeps its colour in a transcript (REGISTER.md §28). */
        /* The categorical ramps are not re-pointed: `Chip` takes blue and teal by meaning, so the welcome turn keeps its colour (REGISTER.md §28). */
      },
    },
    'chat-composer': {
      /* `transparent`, not a colour: the panel's ground is `--color-background-surface` composited over the window ground, and a literal would stop tracking it. */
      base: {'--color-background-popover': 'transparent'},
    },
    /*
     * The menu's visible fill is not here: the element that paints the surface is an unclassed Layer, a parent of `astryx-dropdown-menu`.
     * It rides on an ancestor's `--color-background-popover` (ONL-1908).
     */
    'dropdown-menu': {
      base: {
        maxHeight: 'none',
        backgroundColor: 'var(--color-background-surface)',
        '--container-padding-inline-start': 'var(--spacing-1)',
        '--container-padding-inline-end': 'var(--spacing-1)',
        backdropFilter: 'blur(16px)',
        border: 'var(--border-width) solid var(--color-border)',
        boxShadow: 'var(--shadow-med)',
      },
    },
    /*
     * Re-pointed, not set: `Item`'s label span carries its own colour rule, so a flat `color` is silently overridden (ONL-1908). The lit states use `--color-on-dark` because this scope re-points `--color-text-primary`.
     * `:focus` is suppressed and `:focus-visible` carries the keyboard case: the library focuses the first item when a menu opens (REGISTER.md §28). The flat `:focus` entry cancels the library's own fill and cannot be omitted.
     * ORDER IS LOAD-BEARING: `:hover` last, so it wins at equal specificity.
     * ⚠️ The state keys nest inside `base`: as a sibling of `base`, `':hover'` is read as a variant name and compiles to `.astryx-dropdown-menu-item.hover`, a class nothing sets.
     */
    'dropdown-menu-item': {
      base: {
        '--color-text-primary': 'var(--color-text-secondary)',
        ':focus': {backgroundColor: 'transparent'},
        ':focus-visible': {
          backgroundColor: 'var(--color-overlay-hover)',
          '--color-text-primary': 'var(--color-on-dark)',
        },
        ':hover': {
          backgroundColor: 'var(--color-overlay-hover)',
          '--color-text-primary': 'var(--color-on-dark)',
        },
      },
    },
    /* No key edge: `Kbd`'s only border is a 2px `border-bottom`, the brightest line on a menu panel (REGISTER.md §28). */
    kbd: {
      base: {
        borderBottomWidth: '0',
      },
    },
    'chat-message-bubble': {
      /*
       * A flat `color` is right on `ghost` only: it has no state rules to freeze, and re-pointing `--color-text-primary` would recolour every nested Text, heading and code span.
       * `paddingInline: 0`: inline padding marks nothing on a transparent ground (REGISTER.md §28).
       */
      'variant:ghost': {color: 'var(--color-text-gray)', paddingInline: '0'},
      /*
       * Ink and ground are re-points: nested content carries its own `--color-text-primary` rule and would stay white under a flat `color`.
       * `maxWidth`: `ChatMessageBubble`'s own `max(80%, 280px)` floor exceeds the panel's width, so without this a user message is full-bleed (REGISTER.md §8.3).
       * All four corners keep `--radius-chat` (REGISTER.md §28).
       * Scoped to `sender:user`, never `base`: assistant messages are ghost bubbles on the same component.
       */
      'sender:user': {
        '--color-text-primary': 'var(--color-text-gray)',
        '--color-neutral': 'var(--color-background-muted)',
        // Exact submitted-message frame from the element-selection sketch.
        paddingBlock: 'var(--spacing-2)',
        paddingInline: 'var(--spacing-2)',
        maxWidth: '240px',
        overflow: 'hidden',
      },
    },
    /*
     * ⛔ There is deliberately no `chat-send-button` entry. At 0.1.9 `ChatSendButton` writes `className` after spreading `themeProps`, so the button carries no `astryx-chat-send-button` class and a rule here matches nothing.
     * The send button is styled at its call site in `packages/chat-ui/src/ChatPanel.tsx`.
     */
    /**
     * The design paints the neutral button and the pressed tool chip solid #333333; Astryx's translucent white washes collapse on near-black grounds.
     * Both fixes re-point the var the compiled style reads. Never a flat `backgroundColor`: theme rules sit in `@layer astryx-theme` above every StyleX state rule, so it would freeze hover and press.
     * Not in `tokens`: this theme's @scope'd declaration shadows a root re-point, and moving the token would turn every component's press flash opaque.
     */
    button: {
      /** Buttons animate nothing (REGISTER.md §28). `transition: none` drops no state rule; each still applies, instantly. */
      base: {
        transition: 'none',
        cornerShape: 'superellipse(1.5)',
      },
      /*
       * Flat properties, not a `--color-accent` re-point: `:focus-visible` outlines in `var(--color-accent)`, so the ring would match the button.
       * Hover and press are `background-image` gradients and survive a flat background-color.
       */
      'variant:primary': {
        backgroundColor: 'var(--color-background-inverted)',
        color: 'var(--color-on-light)',
      },
      /**
       * The two neutral variants rest grey and go white on hover and active; `primary` and `destructive` keep their ink (REGISTER.md §28).
       * `':hover'` and `':active'` are reachable as keys inside a style value; only the outer state key cannot be a pseudo.
       * Flat `color` is safe here: both variants set it once, with no state rule to clobber.
       */
      'variant:ghost': {
        '--color-overlay-hover': '#FFFFFF1C',
        '--color-overlay-pressed': '#FFFFFF26',
        color: 'var(--color-icon-secondary)',
        ':hover': {color: 'var(--color-icon-primary)'},
        ':active': {color: 'var(--color-icon-primary)'},
      },
      /** White ink on the #333333 chip, and no hover colour step: the resting ink is already white (REGISTER.md §16). */
      'variant:secondary': {
        '--color-neutral': 'var(--color-background-gray)',
        color: 'var(--color-text-primary)',
      },
      /** Button.js paints only its four built-in variants, so an outline carries all of its own paint (ONL-2961). */
      'variant:outline': {
        backgroundColor: 'transparent',
        color: 'var(--color-text-primary)',
        boxShadow: 'inset 0 0 0 var(--border-width) var(--color-border-emphasized)',
        outlineOffset: '0',
        ':hover': {backgroundImage: 'linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover))'},
        ':active': {backgroundImage: 'linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed))'},
        ':focus-visible': {outline: '2px solid var(--color-accent)', outlineOffset: '3px'},
      },
    },
    /**
     * Unchecked: `checkboxUnchecked` fills with `--color-background-surface`, the translucent panel recipe, which composites darker than a card. Only the fill moves; the ring stays (REGISTER.md §3).
     * Re-pointing the custom property rather than overriding `backgroundColor` is load-bearing: `themeProps` emits no class when `checked` is null, so a flat `base` fill would paint all three states the same.
     * Indeterminate: core routes it through the checked style. Its dash is an unclassed `<div>` painted `var(--color-on-accent)`, reachable only by re-pointing that var here (REGISTER.md §28).
     * ⚠ `--color-background-surface` is read by ~20 core components, at least `RadioList` and `Switch` as a control fill rather than a panel; neither is re-pointed (REGISTER.md §3).
     */
    checkbox: {
      base: {
        '--color-background-surface': 'var(--color-background-muted)',
        transition: 'none',
      },
      'checked:indeterminate': {
        backgroundColor: 'var(--color-background-surface)',
        borderColor: 'var(--color-accent)',
        '--color-on-accent': 'var(--color-accent)',
      },
    },
    // No transition on state colours.
    item: {base: {transition: 'none'}},
    'dropdown-menu-checkbox': {base: {transition: 'none'}},
    'dropdown-menu-radio': {base: {transition: 'none'}},
    switch: {base: {transition: 'none'}},
    'resize-handle': {base: {transition: 'none'}},
    'resize-handle-pill': {base: {transitionProperty: 'opacity, transform'}},
    link: {base: {transition: 'none'}},
    'clickable-card': {base: {transition: 'none', '::after': {transition: 'none'}}},
    token: {base: {transition: 'none'}},
    /** The sort control is the library's own button with no focus style of its own. */
    'table-header-cell': {base: {':has(:focus-visible)': {boxShadow: 'inset 0 0 0 2px var(--color-accent)', borderRadius: 'var(--radius-element)'}}},
    'table-row': {base: {transition: 'none', ':focus-visible': {outline: 'none', backgroundColor: 'var(--color-overlay-pressed)'}}},
    'text-input': {
      base: {
        transition: 'none',
        // Nested in `base`: as a sibling it compiles to a `.focus-within` class nothing sets.
        ':focus-within': {boxShadow: '0 0 0 1px var(--color-text-primary), 0 0 0 4px rgba(255, 255, 255, 0.12)'},
      },
    },
    textarea: {base: {transition: 'none'}},
    selector: {base: {transition: 'none'}},
    'segmented-control-item': {base: {transition: 'none'}},
    /**
     * `FieldLabel` paints the label and the description from one token, and only the label carries a class, so the label is lifted (REGISTER.md §3).
     * Re-pointed, not set: a flat `color` would also beat `labelDisabled`. This moves every form label in the app.
     */
    'field-label': {
      base: {
        '--color-text-secondary': 'var(--color-text-primary)',
      },
    },
    statusdot: {
      'variant:accent': {backgroundColor: 'var(--color-accent)'},
    },
    /**
     * ToggleButton's pressed state is its persistent selected state, yet its fill reads the transient-press wash var.
     * Re-pointed here so every other component's press flash keeps the wash.
     */
    'toggle-button': {
      base: {
        '--color-overlay-pressed': 'var(--color-background-gray)',
        cornerShape: 'superellipse(1.5)',
      },
      /**
       * ToggleButton renders `variant="ghost"`, whose ink is grey; pressed is white. Keyed on the `isPressed:true` class `themeProps` emits: the selector generator reads the class at 0.1.9, not `data-is-pressed`.
       * ORDER IS LOAD-BEARING: `.astryx-toggle-button.true` and `.astryx-button.ghost` are equal-specificity selectors in one layer, so this block stays after `button`.
       */
      'isPressed:true': {
        color: 'var(--color-icon-primary)',
      },
    },
    progressbar: {
      /*
       * The base sets this variant to a literal blue and `extends` deep-merges `components`, so it is displaced by an override, not by deletion.
       * Not `var(--color-accent)`: this declaration sets `--color-accent` itself, and a custom-property cycle computes to no fill. `--color-text-accent` is the same white.
       */
      'variant:accent': {'--color-accent': 'var(--color-text-accent)'},
    },
    /**
     * Supporting-size type, a tighter inset and a larger gap, scoped here so the moved scale steps stop at the tooltip's edge (REGISTER.md §28).
     * ⚠️ Most lines are var re-points because the padding is not on this element: `useTooltip` renders the classed layer container and an inner unclassed div that holds the padding, so a `padding` here adds to the inset.
     * `margin` is `8px`, not a var: `--spacing-1` also feeds the trigger gap, and `--spacing-2` is re-pointed below in this scope.
     */
    tooltip: {
      base: {
        '--text-body-size': 'var(--text-supporting-size)',
        '--spacing-1': 'var(--spacing-0-5)',
        '--spacing-2': 'var(--spacing-1-5)',
        '--radius-container': 'var(--radius-element)',
        margin: '8px',
        /* Unlike the padding, this one belongs on THIS box: the inner box is in flow, so it wraps at the width set here (ONL-2485). */
        maxWidth: '240px',
        /**
         * A dark tooltip: core inverts one by using `--color-text-primary` as the ground and `--color-background-surface` as the ink (REGISTER.md §16).
         * Set as properties: re-pointing `--color-text-primary` would also repaint a `<Text color="primary">` inside.
         * `card`, not `popover`: the same #1f1f1f, but `popover` is `transparent` inside the chat composer.
         */
        backgroundColor: 'var(--color-background-card)',
        color: 'var(--color-text-primary)',
        border: 'var(--border-width) solid var(--color-border)',
        boxShadow: 'var(--shadow-med)',
      },
    },

    hovercard: {
      base: {padding: '0'},
    },

    /** Every toast state takes the app's floating surface; `type` still selects `role` (REGISTER.md §16). */
    toast: {
      base: {
        '--color-background-inverted': 'var(--color-background-popover)',
        '--color-background-error-inverted': 'var(--color-background-popover)',
      },
    },
  },
});
