# The design register: where the design file is silent

The theme (`apps/studio/src/theme/studioTheme.ts`) and the app-local properties in
`apps/studio/src/renderer/src/styles.css` are drawn from the design file, which is the authority
on how Onlook looks. The file does not specify everything a design system needs, so in some
places a value comes from somewhere else: a generator default, a derivation, the design's own
ladder extended by one rung, or a judgement call.

This file lists those places. Before choosing a value the theme does not have, check here; when
you fill a new blank, add a row. Every row is open to a design decision, and where the design
file and a row disagree, the design file wins. Anything not listed here traces to a value read
from the design file.

| Status | Meaning |
|---|---|
| **FILLED** | the design file is silent; a value was chosen, with the rule stated |
| **LEFT** | the design file is silent and nothing was chosen; the inherited base value applies |
| **CONFLICT** | the design file and Astryx disagree; the resolution is stated |
| **SUBSTITUTED** | the design file is explicit and the platform does not allow it; §8 |
| **open** | a design decision is still to be made; what ships is stated |

---

## 0. How a value here gets measured

**The design file is read live, in the design tool.** Nothing from it is extracted into the tree;
a value cited here as evidenced was read from the file.

**When the design file is silent, record "the file does not show this", never "the design does
not have this."** Silence is an absence of evidence about the design, not evidence about it. The
first phrasing sends you to a design decision or a row here; the second reads as a finding and
licenses deleting things. Before treating an absence as a decision, ask what state the capture
is in and what it could not have drawn: hover, focus, active, disabled, empty, error, loading,
overflow, anything behind a menu. A resting-state frame cannot draw controls that appear on
hover, so a frame without them says nothing about whether they exist. A working affordance is
evidence in its own right; silence never outranks it.

**When the node metadata and the raster disagree, the raster wins.** The node tree gives numbers
the file states; the rendered frame shows what it draws. Metadata can describe a wrapper, an
unclipped bound, or a group whose origin is not the origin of its ink. Measure off the raster
whenever a position or size goes into code; use the tree for hierarchy, naming, variable
references and anything the frame does not draw.

**Isolate a coloured element by saturation, not luminance.** A luminance threshold also grabs the
window's rounded corner:

```bash
magick frame@4x.png -colorspace HSL -channel G -separate +channel -threshold 40% out.png
```

**Two ways a measurement misleads while the number is real:**

- **The thing measured is not the thing seen.** A computed style is evidence about that element,
  not about the surface: `.react-flow` can compute the right ground colour while a full-bleed SVG
  from `<Background>` paints every visible pixel. Sample the pixel before believing a colour.
- **The reference has not been through the same pipeline.** Enlargement bloats a thresholded
  bounding box by its own anti-aliasing. Measure both sides at the reference's native scale.

**A fitted constant carries the conditions it was fitted under.** An elide budget in characters,
a padding read off a raster, a min-height from a crop: each holds only while the typeface,
density and capture scale hold. Record what a constant was fitted to beside the number, treat
every one as suspect when a global rendering condition changes, and retune them in a separate
commit from the change that invalidated them. A visual read is not a substitute for measuring.

**A component's own defaults can break the budget it sits in.** Astryx's `LayoutHeader` carries
its own block padding, so two panel headers both written as "12px padding" land at different
heights. A shared edge needs its own number (`REGION.panelHeader`), since a relationship between
two components cannot be owned by either one.

**Verify a change where it ships.** A browser render cannot judge what comes from Electron or the
OS: window dragging, the traffic lights, and whether the app's own font wiring works. A host
that already serves `Inter Variable` or `JetBrains Mono Variable` under those names renders a
broken font setup correctly, which is a false pass. Name the surface a claim depends on before
making it.

---

## 1. Typography

| Token / decision | Status | Value | Rule applied |
|---|---|---|---|
| Type scale anchor | — | `{base: 13, ratio: 1.125}` | `Math.round(base × ratio^step)` yields 12 / 13 / 15, the design's `mini`, `small` and onboarding subhead sizes. |
| Heading 1 size | **CONFLICT** | 19px (design shows 18px) | The ratio produces `Math.round(13 × 1.125³) = 19`. Hand-pinning `--font-size-2xl` would desynchronise the ramp from its ratio. |
| Line height | **CONFLICT** | Astryx's, ~1.5385 at 13px (20px) | The design specifies 1.4 at 13px and `normal` at 12px; Astryx computes leading itself and cannot produce 18.2px. §7.1. |
| Heading weight | — | `medium` (500) | The design never goes above Inter Medium; Astryx defaults headings to semibold. |
| Mono family | **SUBSTITUTED** | JetBrains Mono (design says SF Mono) | SF Mono can be neither bundled nor referenced. §8.1. |

## 2. Radius

| Token | Status | Value | Rule applied |
|---|---|---|---|
| `--radius-element` | — | 4px | The design's dominant radius. The `{base: 4, multiplier: 0.5}` anchor is chosen to land it. |
| `--radius-container` | **CONFLICT** | 8px (generator gives 6) | Astryx's ramp is fixed-proportion `inner:element:container:page = 1:2:3:7`; the design's is linear 4 / 8 / 12. No `(base, multiplier)` pair satisfies both, so the design's value overrides. |
| `--radius-page` | **CONFLICT** | 12px (generator gives 14) | Same cause. |
| `--radius-chat` | — | 8px | The design's one chat bubble, which equals `--radius-container`. All four corners are rounded. |
| `--radius-inner` | **LEFT** | 2px (generated) | The design has no 2px radius; nothing depends on it. |
| Design drift `4.8`, `5` | — | normalised to 4 | The composer's icon buttons draw `rounded-[4.8px]` and `p-[7.2px]`, a 1.2 scale applied to 4 and 6, and one lone 5. Normalised to the 4 / 8 / 12 ladder rather than reproduced. |
| Design `24` | — | `--radius-full` | `rounded-[24px]` on the 23px-tall address pill is a full pill, not a ramp step. |

## 3. Colour

### The accent marks state

`--color-accent` is white (`--color-on-dark`). It marks state: running, selected, current,
checked, focused. Focus rings, checked and selected states, primary fills and menu checkmarks
read white, and selected fills read `--color-background-gray`. A control that knows nothing about
app state has nothing to signal, so the accent is never a level of importance.

The accent family is re-pointed on two scopes, never repainted beside it:

- **The canvas** (`.react-flow`, `[data-accent='canvas']`) re-points it at the teal ramp
  (`--studio-teal-*`), so a selected Object on the canvas is teal.
- **An artifact** (`[data-accent='artifact']`) re-points it at the blue ramp. Blue marks kind:
  an artifact's selection is blue, so one mark says what the Object is and what state it is in.
  §8.2.

The categorical `--color-*-teal` family (the Beta chip, the workspace chip, a done status) is a
separate use of the same hue.

Emphasis is carried by neutrals: `--color-background-inverted` (white, the affirmative CTA) ›
`--color-background-gray` (#333, neutral) › ghost. In the design file teal marks the canvas's
selection outline and handles, the selected sidebar row, the branch chip and the run control, and
the affirmative CTA is `bg/foreground` white. Astryx's `Button variant="primary"` is the one core
component where the accent means "important", so the theme re-points `variant:primary` at the
inverted CTA.

Two library facts, at core 0.1.9:

- **A new token name cannot be minted.** `TokenName` is a closed union derived from the
  library's defaults, so a `--color-brand-*` in `tokens:` is a type error. App-owned values live
  in `styles.css` as `--studio-*` properties.
- **A custom Button variant carries all of its own paint.** `Button.js` resolves paint through a
  four-key object, so an unknown variant gets no background, ink, hover, press or focus outline
  from the library. `variant:outline` (ONL-2961) supplies each in `components.button`; its ring
  is `--color-border-emphasized` (#606060), the nearest rung to the design's #5a5a5a.

**open — the disabled primary.** A disabled white primary (white at `--button-disabled-opacity:
0.5`) renders at luminance 143 on a `#1f1f1f` card, an enabled secondary at 51, so a disabled
affirmative outweighs a live neutral one. Opacity cannot fix it: the value that sits below 51 is
about 0.09, far below legibility. The design draws a distinct disabled surface (`bg/disabled`
#1a1a1a with #606060 ink); applying that to every primary Button is a theme-wide decision.

### Filled

| Token | Value | Rule applied |
|---|---|---|
| `--color-border-emphasized` | `#606060` | The design defines one border colour (`border/default` #494949). #606060 is the next rung up its achromatic ladder. |
| `--color-overlay-pressed` | `#FFFFFF1C` | Derived. `bg/active` #333333 is the pressed surface on `bg/primary` #1a1a1a; `26 + 229a = 51` gives `a = 25/229` → `0x1C`. |
| `--color-overlay-hover` | `#FFFFFF0E` | The design shows no hover wash. Half the pressed wash, by convention. |
| `--color-overlay` | `#000000CC` | The file has no modal or scrim. |
| `--shadow-high` | `0 8px 20px #00000080` | The design has two elevations (`Soft shadow`, `Base Surface`); this extends their trend. |
| `--shadow-inset-hover`, `--shadow-inset-selected` | `inset 0 0 0 0.5px transparent` | The base theme lifts surfaces with an inset highlight; this design's surfaces are flat and separated by hairlines. Transparent rather than `none`, because these compose into multi-shadow lists, where a literal `none` invalidates the whole declaration. |
| `--color-tint-hover`, `--color-neutral`, `--color-track` | low-alpha white / ladder values | Tokens the design never addresses, set to ladder values so nothing falls back to a chromatic base value. |
| `--color-skeleton` | `#333333` | The design's literal `bg/secondary` #1f1f1f equals `--color-background-card`, so a Skeleton on a card, panel or popover would be invisible. The fill moves to the next rung; the card does not, because it also carries panels and popovers. Any fill token equal to a ground token is this bug, so `studioTheme.test.ts` asserts every fill token (`--color-skeleton`, `--color-background-gray`, `--color-track`) differs from every ground token (`--color-background-body`, `-muted`, `-card`, `-popover`) (ONL-2214). |
| `--color-error` | `#f66` | Supplied by the design: its one destructive treatment, a raw `#f66` on a menu's remove item (ONL-1908). It takes the semantic slot, since `--color-error` is what a destructive surface already reads. `--color-error-muted` and the `-red` family keep the base theme's values, so an error Banner does not agree with this token. |

### Left blank

| Tokens | Why | Consequence |
|---|---|---|
| **Status palette**: `--color-success`, `--color-warning`, every `-muted` and `--color-on-*` | The design file contains no success or warning state. | They keep the base theme's vivid values, which read loud against an achromatic UI the first time a status surface uses them. **open.** |
| **Seven categorical hues**: cyan, green, orange, pink, purple, red, yellow | The design uses only teal, blue and grey chips. | As above; they are also the `light-dark()` population (§6). |
| **Syntax tokens**: the 14 `--color-syntax-*` | No code-highlighting surface in the theme's scope. | The code view draws its own (§25). |
| **Motion**: `fast`, `medium`, `slow`, easing | Still frames say nothing about duration or easing. | The base theme's motion carries. |
| **The window ground `#262626`** | A bare hex in the design matching no variable: the full-width top bar's ground and the ground its translucent panels composite against. | **`--studio-ground`**, one role at the document root in `styles.css`. `TokenName` is closed, and occupying an unused semantic slot would repeat the `text-gray` compromise below; the `--studio-` prefix keeps it outside the library's grammar and migratable. |

### Mapping compromises

| Design | Mapped to | Why it is a compromise |
|---|---|---|
| `text/tertiary` #929292 | `--color-text-gray` | The design has five neutral text tiers (#ffffff, #acacac, #929292, #606060, #494949); Astryx has three neutral slots, and `TokenName` is closed. #929292 is the colour of the chat transcript, so a categorical slot carries a neutral tier. |
| `color/Gray/701` #494949 as text | shares `--color-border` | The design uses the border colour as text. No separate token. |
| The teal ramp: `Teal/201` #00deba, `Teal/901` #002a23, `Teal/101` #cbfff6, `Teal/1000` #00211c, `Teal/301` #00c1a2 | `--studio-teal-hue`, `-fill`, `-ink`, `-fill-dim`, `-ink-dim` | Astryx's accent family has two slots and no `--color-on-accent-muted`. The roles that read the ramp (`--studio-on-accent-muted`, `--studio-accent-dim`, `--studio-on-accent-dim`) are neutral at the root and re-point at it on the canvas scope. |
| `bg/secondary` #1f1f1f as a **chip** fill | `--color-background-gray` = #333333 | The near-black ladder has four values (#000000, #1a1a1a, #1f1f1f, #333333) for five roles: page, recessed, card, chip-on-card, active. Card-and-chip is the pairing guaranteed to collide, because a chip sits on a card: a neutral Badge on a Card is an invisible pill. Every #1f1f1f chip in the design sits on the translucent toolbar panel, so the file encodes "a chip is one step brighter than its ground". The chip moves rather than the card, because the card also carries panels and popovers. What still shares #333333 is chip, active and skeleton; a Skeleton on a gray chip or inside a pressed row is the same fill-equals-ground failure, and the test above does not cover it. |
| `bg/toolbar-base` #000000D9 as a **control fill** | `--color-background-surface`, re-pointed on `checkbox` | Astryx reads this token both as a raised panel (Dialog, Tooltip, HoverCard, AppShell) and as a control fill (unchecked checkbox and radio, the Switch thumb, SegmentedControl, Selector). As a control fill the translucent panel recipe composites to near-black: an unchecked checkbox on a #1f1f1f card reads darker than its own ground. `checkbox` re-points `--color-background-surface` → `--color-background-muted` on that component alone, leaving Astryx's checked and hover logic intact. Only the fill moves: a ring at `--color-border` leaves the box carrying less ink than the text beside it, so an off control stops reading as hittable. `RadioList` and `Switch` carry the same exposure with no re-point. **open:** whether the panel recipe should own this token at all. |
| A form **label** vs its **description** | `field-label` re-points `--color-text-secondary` → `--color-text-primary` | `FieldLabel` paints the label and the description from one token, so they are one colour in any theme. Only the label carries a class and the two are siblings, so the only possible direction is lifting the label. It re-points the var rather than setting `color`, because a flat `color` would also beat the disabled label, which has no class to restore it. Applies to every `FieldLabel` consumer (`Field`, `CheckboxInput`, `Switch`). The ` ∙ Optional` suffix is a child of the label and inherits its ink. |

**An override re-points a variant at a token; it never restates a token's value.** A hardcoded
hex in `components` never consults the token it duplicates, so a later token change has no
effect and nothing errors. `components` holds no colour literals. A single-site value with no
token is an escape hatch; the moment a second surface needs it, it is a token not yet minted.

## 4. Base Surface: the recipe the theme cannot fully carry

The side panels, the dropdown menus and the canvas toolbar take one named effect style. Only its
colour fits in a token; Astryx has no blur token, so a component applies the rest:

```
background:      var(--color-background-surface)   /* #000000D9 */
backdrop-filter: blur(16px)                        /* only where it floats over content */
border:          0.5px solid var(--color-border)   /* #494949 */
box-shadow:      var(--shadow-med)                 /* 0 4px 10px #00000080 */
```

- **The blur goes where the surface floats over other content**, such as the dropdown menus. The
  side panels and the canvas toolbar paint the surface over their own `--studio-ground` backing
  (`PANEL_SURFACE`, `panels/surface.ts`), which resolves to #060606 and needs no blur. `--studio-band` holds the
  same resolved value for the top band, which lives in a transparent view where a translucent
  fill would smear.
- **The 0.5px hairline is load-bearing.** This design separates columns by lines, not by tone;
  the fills are nearly the same colour on purpose. A 1px hairline reads heavier than intended.
- **`--color-background-surface` is translucent.** It stays translucent; a surface that must be
  opaque gets a backing, as the panels do.

### A design-tool effect radius converts per property

| Target property | Conversion |
|---|---|
| `box-shadow` | 1:1 |
| `filter: drop-shadow()` | ÷2 |
| `backdrop-filter: blur()` | ÷2 |

One token in the file emits both forms: `Soft shadow` (radius 5) is `5px` in a box-shadow and
`2.5px` in a `drop-shadow()`, and `Base Surface`'s background blur of 32 emits `16px`.

## 5. Spacing

The design ramp is 4 / 8 / 12 / 16 / 32. Astryx's default ramp is 4-based, and `defineTheme`
exposes no spacing input, so spacing has no overrides. Wanting to override spacing is a sign
something else is wrong.

## 6. `light-dark()`

The generated theme (`renderer/src/theme/studio.css`) still carries `light-dark()` pairs. None
comes from this theme's input: it passes no `color:` block, so `expandColorScale` never runs, and
every pair is a literal inherited from the base theme through `extends`. They are the long tail:
the categorical hues, the status palette and the syntax tokens, the blanks in §3. Passing
`color:` would add more, since `expandColorScale` emits 27 tokens of which 25 are pairs.

They resolve to their dark side because `<html>` carries `data-theme="dark"`
(`renderer/index.html`), which the generated CSS reads as `color-scheme: dark`. Astryx's
`useTheme()` also reads that attribute when no `<Theme>` provider is above it; without it, the
library's JS-side mode follows the operating system's appearance (ONL-2093). Filling the status
and categorical palettes with flat dark values would retire the pairs; that is a design decision.

## 7. Where the design file and the platform fight

### 7.1 Line height

The design wants 1.4 at 13px. Astryx computes 1.5385 by a tiered ratio, snapped to a 4px grid
and floored at `fontSize + 4`, and cannot produce 18.2px at any setting. Overriding
`--text-*-leading` theme-wide gives up the grid snap for every surface, so each surface decides.
**open** theme-wide. Surfaces that decide:

| Surface | Leading | Why |
|---|---|---|
| Settings pane | 1.4 (`--studio-settings-leading` on the pane's container, `settings/rows.tsx`) | Re-points the body, label and supporting leading so the design's 18.2px lands there alone. |
| Dense sidebar rows | `normal` at 12px (`DESIGN_LEADING_12`, `panels/rowGeometry.ts`) | Astryx lands on 20px at both 12px and 13px, and the difference compounds down a list. |
| Prose in the welcome turn | 1.4 (`packages/chat-ui/src/WelcomeTurn.tsx`) | Prose reads at the design's leading. |
| Composer input | Astryx's 22px line box | One multi-line typing area, where looser leading is easier to type into. |

### 7.2 Mono face

SF Mono is unreachable, so the mono face is a substitution. §8.1.

### 7.3 Neutral text slots

Astryx has three neutral text slots against the design's five tiers, and `TokenName` cannot be
extended. The transcript colour lives in a categorical slot (§3); the alternative, a
per-component override, is worse for consistency.

---

## 8. Forced divergences: the design file is explicit and the platform does not allow it

Each row here is a place where the product knowingly differs from an explicit design value, for
a technical reason. Each is **open**: if the substitution is fine the row closes; if the original
was chosen for a reason the substitution may not serve, it needs to change.

### 8.1 Monospace face: design says SF Mono, the app ships JetBrains Mono

| | |
|---|---|
| **The design asks for** | SF Mono, on all monospace content |
| **The app ships** | JetBrains Mono (`'JetBrains Mono Variable'`, bundled, OFL) |

1. **SF Mono cannot be bundled.** It is not redistributable.
2. **It cannot be referenced either.** In the built app, `ui-monospace`, `"SF Mono"` and
   `SFMono-Regular` render identically to a bogus family name. Chromium does not implement the
   `ui-*` generic families, and macOS does not expose SF Mono to web content by any name; an
   `@font-face { src: local(…) }` fails across six name variants. A stack naming SF Mono
   degrades silently to Menlo.

JetBrains Mono is OFL, so bundling is clean, and it is well drawn at small UI sizes. SF Mono may
have been chosen to feel like the same family as the UI text, which JetBrains Mono does not do
(larger x-height, more distinctive letterforms, wider advance). If that matters, the answer is a
closer licensed face, since the system face cannot be obtained.

Use `--font-family-code` and nothing else for mono: it is the single point of change. Never name
a mono family in a component, and never put `ui-monospace` or `"SF Mono"` in a stack: they
resolve to nothing. The family name carries the ` Variable` suffix, and its loading is in
`styles.css`; a mismatch in either falls through to the next fallback silently.

### 8.2 Chat panel

| | Design | Shipped | Why |
|---|---|---|---|
| Transcript row gap | `10px` | `8px` (step 2) | `SpacingStep` is a closed union (0 · 0.5 · 1 · 1.5 · 2 · 3 · 4 · 5 · 6 · 8 · 10 → 0/2/4/6/8/12/16/20/24/32/40); 10 sits between steps 2 and 3, and a raw px where a scale exists is what §5 rules out. |
| Composer bottom padding | `8px` | `12px` | Astryx pads the composer body from one value. The design insets 12 on three sides and 8 at the bottom; the 12 sets the text inset on every side and lands exactly from `density="balanced"`. |
| Above the composer | a hairline | a hairline and a 12px blur scrim | The scrim is `ChatLayout`'s, on an internal div with no class or prop. Reaching it means replacing `ChatLayout`, which owns the transcript's auto-follow. |
| Composer input leading | 1.4 | 22px | §7.1. |
| Composer placeholder | `Type your message...` | `chat.composer.placeholder` | **open.** Ours names what Onlook does with the message; the design's is the generic chat affordance. It is the highest-contrast string in the panel. |
| Question sheet step numbers and close | the file does not show this | number 20×24, close 24×24, 4px radius (`QuestionSheetView.tsx`) | FILLED (ONL-2901). |

The attachment pills add four component measurements that do not map to Astryx spacing steps, as
app-local properties because `defineTheme.tokens` accepts only the closed union:

| Token | Value | Evidence |
|---|---:|---|
| `--studio-attachment-pill-height` | `22px` | composer and submitted attachment pills |
| `--studio-attachment-leading-size` | `16px` | an unsubmitted pill's leading visual |
| `--studio-submitted-attachment-width` | `232px` | the submitted attachment shelf inside the user bubble |
| `--studio-submitted-attachment-marker-size` | `11px` | a submitted element's marker |

The accented pill (ONL-2042) reads three accent roles, design variables rather than filled values:

| Token | Root value | Canvas value | Design variable | Consumers |
|---|---|---|---|---|
| `--studio-on-accent-muted` | `--color-on-dark` | `--studio-teal-ink` #cbfff6 | `color/Teal/101` | accented pill ink (resting); sidebar selected-row ink |
| `--studio-accent-dim` | `--color-background-muted` | `--studio-teal-fill-dim` #00211c | `color/Teal/1000` | accented pill fill (submitted) |
| `--studio-on-accent-dim` | `--color-text-secondary` | `--studio-teal-ink-dim` #00c1a2 | `color/Teal/301` | accented pill ink (submitted) |

The resting fill already has a home in `--color-accent-muted`. The submitted ink descends from
the accent (`Teal/201`), not from the resting ink: they are separate roles, and deriving one from
the other lands close enough to look right and be wrong.

The model mark is the design's own (`IconClaudeai`, in the licensed icon family). The design's
icon layer names (`IconPaperclip2`, `IconProgress25`) match the family character for character,
so a glyph that does not match is a drifted copy, not a different design language. Confirm by
rendering.

#### The artifact accent: the palette's second hue

| Hue | Marks | Family |
|---|---|---|
| Teal `#00deba` | **state, on the canvas**: a selected or hovered Frame, text or image | `--studio-teal-*`, re-pointed into the accent family under `.react-flow` and `[data-accent='canvas']` |
| Blue `#53b8ff` | **kind**: an Artifact | the five `--studio-artifact-*` roles, re-pointed at the blue ramp |

Blue has one ramp, `--studio-blue-*`, and every blue consumer re-points at it: the artifact
accent and `--studio-git-download-hue`. The ramp anchors on `#53b8ff`, the git pill's own value
and the only blue that traces to the design file (ONL-2172).

| Token | Value | Basis | Consumers |
|---|---:|---|---|
| `--studio-blue-hue` | `#53b8ff` | the design file, via the git pill | git Download hue; artifact ring, handles, badge fill |
| `--studio-blue-fill` | `var(--color-background-blue)` | `color/Blue/901` #002a48, the categorical blue | artifact sidebar row fill |
| `--studio-blue-ink` | `#d6ecff` | FILLED: the pale step, at the teal ramp's `Teal/101` relationship | artifact row ink |
| `--studio-blue-fill-dim` | `#00213a` | FILLED: the step below `fill`, at teal's `Teal/1000` relationship | none yet; holds the role so the family is whole |
| `--studio-blue-ink-dim` | `#1f93e6` | FILLED: descends from the hue, as teal's `Teal/301` does | none yet; holds the role so the family is whole |

**The three filled stops move with `hue`.** Re-seed the hue and re-derive them together, or the
family stops being a family. There is no artifact in the design file to check them against.

The five `--studio-artifact-*` roles are a re-point layer over this ramp, one per step, so the
meaning (artifact) and the colour (blue) read separately: moving the artifact accent off blue
changes five `var()`s and no use site. The two stops with no consumer exist so the next surface
that needs a dim artifact fill finds one rather than inventing a value at the use site.

`--studio-git-download-tint` stays `#001b2e` rather than `fill`: the pill's tint sits behind small
text at a different contrast than a sidebar row's fill. It is the row to revisit when blue is
designed as a family. Under a P3 display the blue ramp is pushed wider; `p3.test.ts` holds both.

### 8.3 Standing rules from the first port

**Ghost the control, never fabricate its value, and render the two at visibly different ink
tiers.** A design mock is full of values the product does not have yet, and pixel-matching
rewards inventing them. Ship the control visible and disabled, with an empty or labelled-only
reading; a placeholder at full brightness reads as a fact. In a spec, assert the ghost is
disabled, not merely visible: a ghost that goes live by accident passes every is-it-visible check.

**Never prettify a real value with a lookup map.** A map fails toward confident wrongness: an
input it does not know renders blank or borrows a neighbour's label. `modelLabel`
(`packages/events/src/models.ts`) reads the family and version out of the id the session
reported and returns an id it does not recognise verbatim, so an unknown model degrades to an
ugly string rather than a wrong one.

**The frame's chrome counter-scales with the canvas zoom.** The address is the label that tells
you which Frame you are looking at, so it holds one screen size as you zoom out. The scale is
`1/zoom`, unclamped: a bar is read, not grabbed (`chromeScale`, `canvas/frame/geometry.ts`). Below
zoom 0.18 only a selected Frame keeps its chrome, because the bars become a wall over tiny frames
(`CHROME_MIN_ZOOM`).

**What a designer reads and what the app navigates to are two functions.** `displayUrl`
(`packages/events/src/canvas-url.ts`) renders the design's elided `localhost:3000`;
`normalizeDevUrl` owns what is navigated to and keeps the scheme. A formatter that can be fed to
a navigation is a bug waiting to happen.

**React Flow's attribution chip is hidden** (`proOptions` in `canvas/Canvas.tsx`). The design
draws nothing there. `@xyflow/react` is MIT, whose condition is that the notice ships with the
software, which it does; the on-screen panel is the author's request, not an obligation.

**The end panel is the design's 307** (`REGION.end`). `ChatMessageBubble`'s own
`max(80%, 280px)` floor exceeds the content box at that width, so the library's constraint does
nothing; the theme sets the user bubble's width on `chat-message-bubble` `sender:user` rather
than sizing the region around a component.

---

## 9. Frame selection handles

Four handles, one per corner of the Frame's viewport box (`canvas/NodeResizeHandles.tsx`):

| | Design | Shipped |
|---|---|---|
| painted extent | 9 units | `9`, counter-scaled to screen px |
| fill box | 7 units, stroked outside | — |
| stroke | 1 unit `color/Teal/201` | `var(--color-accent)`, 1.25px counter-scaled |
| fill | `bg/primary` #1a1a1a | `var(--color-on-dark)` |
| corners | square | `var(--radius-none)` |
| anchor | the viewport corner | the viewport corner |
| paint order | the handle covers the selection line | `zIndex: LAYER.raised` |

**`9` in the code against the design's `7` is not a divergence.** The design tool strokes the
7×7 box outside, so 7 is the fill and 9 is the ink; React Flow's handle is `box-sizing:
border-box`, so CSS carries the painted extent.

The fill and the stroke weight diverge on purpose. On the dark canvas a dark fill left only a 1px
border to find the handle by, and a 1px accent border read as a dark square, so the fill is white
and the border is 1.25px. The handles hold a constant screen size at every zoom, because they are
grab targets; their grab area reaches 7px out from the edge and 3px in, since every pixel inside
the edge is one the user cannot click into the page.

## 10. Frame navbar: the three states

The design draws three separate states: default, hover, editing. Nearly every value maps onto a
token that carries it exactly:

| Design value | Variable | Token | |
|---|---|---|---|
| address text, resting `#acacac` | `text/default` | `--color-text-secondary` | exact |
| address text, hover and editing `#ffffff` | `text/primary` | `--color-text-primary` | exact |
| nav icons `#929292` | `icon/default` | `--color-icon-secondary` | exact |
| `↗` `#ffffff` | `icon/active` | `--color-icon-primary` | exact |
| address type, Inter 400 / 12px | `Onlook Styles/mini` | `--font-size-sm` (0.75rem) | exact |
| container radius 24 on a 23-tall pill | — | `--radius-full` | equivalent |

| Value | Status | Shipped | Rule applied |
|---|---|---|---|
| Address container fill, hover and editing | **FILLED** | `--color-background-gray` (#333333), opaque (`canvas/frame/FrameToolbar.tsx`) | The design draws a translucent 10% white, which reads see-through over frame content while editing. #333333 is the design's ladder value for "one step brighter than its ground" (§3) and is opaque. `--color-background-surface` is translucent by design and is never borrowed to make something opaque. The pill carries the fill; the input inside stays transparent. Resting stays chrome-less, as all three states draw it. |
| The sidebar's rename input | — | transparent | It sits on the sidebar's own Base Surface and replaces a label in the label's box, so it is never see-through over variable content, and an opaque box where a label sits flush would be a fill the design does not draw. |
| The `↗` against a long address | **FILLED** | a symmetric `--spacing-5` reserve on the address text, resting state included | The icon sits 5 inside the container's right edge and the design draws only the non-colliding case. The reserve keeps 5px of clearance at every address length, and the URL does not move when the `↗` appears; a long address truncates earlier than the container could hold. |
| Bar width | — | spans its Frame | The design's in-editor screens draw the bar across the Frame; the three state studies hold for everything inside it. |
| Address container width | — | capped at `342` (`ADDRESS_MAX_WIDTH`, `canvas/frame/geometry.ts`) | The studies' 342 caps the pill rather than describing it, so the pill keeps the drawn size on a wide Frame. |
| The URL's centre | — | the Frame's centre | The two side groups share the leftover space equally. |
| Reload and `↗` glyphs | — | 14 | Between `Icon`'s `xsm` 12 and `sm` 16; geometry belongs to the component, appearance to the theme. |
| The container's `gap: 10` | — | not built | Inert in all three states: both children are absolutely positioned, or the text is the only in-flow child. |
| Address line height | **LEFT** | the theme's | `Onlook Styles/mini` declares `lineHeight: 100` with no unit while the design tool's code export renders the same text as `leading-[normal]`. The ambiguity belongs to the file's whole type scale. |
| The editing state's text | — | the full URL, scheme included | The design draws the same bare `localhost:3000/…` in all three states. `displayUrl` strips the scheme, so seeding the draft with it would make Enter on an unmodified `https://` Frame retarget it to `http://`. Editing shows the value navigated to. |

## 11. Window regions

| | Design | `REGION` (`renderer/src/layout.ts`) |
|---|---|---|
| Top band | full-width, above everything | `REGION.topBar` = `WINDOW_BAR_HEIGHT` (36, `packages/events`) |
| Sidebar width | 259 | `REGION.sidebar` 259, profiled off the raster at 4x |
| End panel width | 307 | `REGION.end` 307 |

Band and region geometry belongs to `REGION`, never to the theme: the theme owns appearance, the
layout owns geometry. A theme override asserting a height is a bug.

The projects menu study draws **Make a copy · Reveal in Finder · Settings · Remove** beside
Rename. Settings is not built: a control ships when it acts (ONL-2329). Remove asks first through
a native dialog: the file shows no modal or scrim anywhere, so the confirm follows the app's other
user-initiated destructive confirms. A drawn confirm would replace it.

## 12. Projects view: the card grid

The design file states the grid twice, and the two disagree: the declaration is four `1fr`
columns, and the raster draws cards a fixed 273 wide with `justify-self: start`, so the fourth
card overruns the content's right padding. The disagreement is a mechanism, not a value: a
fixed-width child in a narrower `1fr` track renders exactly that overrun. A margin asymmetry that
precise at a window edge is residue, and only the declaration survives a resizable window.

So the card is **fluid**. `gridTrack.ts` holds a floor of 220, not the design's 273: at 273 the
grid falls to three columns, and pinning the card there reintroduces the overrun. The thumbnail
holds the design's 273:140 as an aspect ratio rather than fixed pixels.

## 13. Projects view: navigation

Once onboarded, the Projects Screen is the root, so it needs no back-out affordance: the way out
is opening a Project, and the band's folder control is the way back. Every launch opens on the
Projects Screen; the window's own Tabs restore beside it (`main/location/state.ts`, ONL-2090,
ONL-2208).

## 14. Panel resize bounds

The design file draws each panel at one width and does not show resizing, so the defaults are
evidenced and the bounds are not:

| Value | Status | Number | Rule |
|---|---|---|---|
| sidebar default | — | 259 | the design's width (`REGION.sidebar`) |
| chat default | — | 307 | the design's width (`REGION.end`) |
| sidebar min–max | **FILLED** | 200–480 | judgement |
| chat min–max | **FILLED** | 280–800 | judgement |

The bounds live in `packages/events/src/panels.ts` (`PANEL_LIMITS`), one source for main's read
validation and the renderer's drag clamp. A persisted value outside them is dropped to the
default, never clamped (`main/panels/state.ts`).

## 15. The element picker's outline ink

| Value | Status | Number | Rule |
|---|---|---|---|
| picker outline ink | **FILLED** | `color(display-p3 0.98 0 0.229)` | the brand red, `P3 HSL 346 100 49` converted to Display P3 coordinates |

- **It is not a theme token and does not live in the theme.** It is painted by the guest preload
  inside the user's page, which cannot read the theme's custom properties. It lives in
  `packages/events/src/elements.ts` as `PICKER_INK`, the one module both sides share.
- **P3, not sRGB.** `hsl(346 100% 49%)` read in sRGB is a duller, different red; the wide-gamut
  value is the point of the colour.
- **It is not the accent**, which marks the Frame's own selection ring.

The outline's width is 1px on hover and 2px selected, counter-scaled by the canvas zoom so it
holds one screen pixel at any zoom.

## 16. Toasts, tooltips and the secondary Button

The design file draws no toast. **Every toast state renders in the app's default background and
foreground**: no red for errors, no green, no amber. Semantic colour belongs to a deliberate
product design, and there is none behind a coloured toast, so the words and the offered action
carry the state. This holds for the product's look generally.

| Value | Status | Number | Rule |
|---|---|---|---|
| toast ground, all states | **FILLED** | `var(--color-background-popover)` | A toast is a floating surface and takes the token every floating surface takes. `--color-background-inverted` and `--color-background-error-inverted` re-point at it on `toast` alone, so `type` still selects `role="alert"` or `role="status"` and changes nothing about the paint. |
| `onLight` / `onDark` | **FILLED** | the app's own dark palette | below |

`MediaTheme` inverts by flipping `color-scheme`, which only moves `light-dark()` pairs, plus three
hand-written re-points in core's `onMediaTokens.ts`. In a flat dark theme nothing is a pair, so
everything else keeps its dark-UI value on whatever ground the component painted: a ghost action
at `#929292` on white measures 3.2:1. The answer is not inverting: both blocks return
`color-scheme` and the primaries to the dark side and let every other token inherit, so a media
context reads like anywhere else. `--color-accent` re-points at `--color-text-accent`, because
core's default collapses it to the on-colour, which draws a black focus ring on a dark ground.
`Toast` and `OverlayScrim` are core 0.1.9's only `MediaTheme` consumers. These rules cannot reach
the document root: `<html>` is also the `@scope` root, and a bare compound selector inside
`@scope` never matches the scoping root.

### The tooltip

Core inverts a tooltip by borrowing two tokens for the wrong jobs: `--color-text-primary` becomes
the ground and `--color-background-surface` the ink (`useTooltip.tsx`).

| Value | Status | Number | Rule |
|---|---|---|---|
| tooltip ground / ink / edge | **FILLED** | `--color-background-card`, `--color-text-primary`, `0.5px --color-border`, `--shadow-med` | The dropdown menu's recipe, so a tooltip reads as the same kind of floating object. Set as CSS properties rather than by re-pointing the two tokens, which would also repaint any `<Text color="primary">` inside it. `card` rather than `popover`: the same #1f1f1f, but `popover` is `transparent` inside the chat composer, where a tooltip would be see-through. |
| tooltip max width | **FILLED** | `240px` on the layer box | One line of the band's longest copy at the supporting size. It sits on the layer box, because the inner box is in flow and wraps at the width set here. `Tooltip` takes no `className`, `style` or `xstyle`, so the cap is global: a tightening of core's 300px (ONL-2485). |
| tooltip margin | **FILLED** | `8px` | Global to every tooltip. |

### The `secondary` Button's ink

`variant:secondary` paints `--color-text-primary` on its #333333 chip (12.6:1). The design's Back
button is `bg/active` #333 with white ink; the library's `--color-icon-secondary` measures 4.1:1,
under AA. There is no hover colour step: the resting ink is already white, and Astryx's own
`secondary` washes the chip with `--color-overlay-hover` / `--color-overlay-pressed`.

## 17. Passed-through agent text

Prose the product does not author and cannot bound, such as an agent's or an install's failure
message, can carry a long filesystem path with no spaces, wider than any panel. That text breaks
mid-token with `overflow-wrap: anywhere`, which breaks a token only when it cannot fit and leaves
ordinary prose wrapping at spaces.

`Text`'s `wordBreak` prop is not the instrument: it applies only when `maxLines > 0`, so on
untruncated text it typechecks and does nothing.

## 18. Git status pill and card (ONL-2172)

Colour pairs are design values, so these are census rows; the pill heights and the missing rungs
are FILLED. All live as `--studio-git-*` properties in `styles.css`: `defineTheme.tokens` is
closed, and the theme's status slots are neutralised on purpose (§16), so painting git hues into
them would repaint every Badge, Banner and StatusDot. Chromatic status exists in git scope only.

Hue is border, text and glyph; tint is fill.

| Token | Value | Design role | Consumers |
|---|---:|---|---|
| `--studio-git-error-hue` / `-tint` | `#ff8ba7` / `#3e000f` | Error | Resolve Conflicts, Fix Checks; card Checks Failed, Conflicts |
| `--studio-git-ready-hue` / `-tint` | `#00c441` / `#00240c` | Ready to Merge | pill and card |
| `--studio-git-upload-hue` / `-tint` | the teal ramp's `ink-dim` / `fill-dim` (#00c1a2 / #00211c) | Upload | Upload Changes; card Not Uploaded |
| `--studio-git-download-hue` / `-tint` | `--studio-blue-hue` / `#001b2e` | Download | Download Changes; card Updates Available |
| `--studio-git-merged-hue` / `-tint` | `#c174ff` / `#29004b` | Merged | pill and card |
| `--studio-git-primary-ink` / `-border` / `-fill` | `#000000` / `#929292` / `#ffffff` | Primary (white chip) | Create PR, Push |
| `--studio-git-neutral-hue` / `-tint` | `#929292` / `#1a1a1a` | Neutral (derived) | Checks Running, Draft PR, PR Closed, trust states, working border |
| `--studio-git-menu-fill` / `-border` | `#1a1a1a` / `#494949` | Dropdown and tooltip surface | the pill's dropdown |
| `--studio-update-fill` / `-ink` | `#ffffff` / `#000000` | Update Now (white pill, black label) | the band's update pill |

| Token | Value | Evidence |
|---|---:|---|
| `--studio-git-pill-height` | `26px` | the chrome pill |
| `--studio-git-card-label-size` | `11px` | card-scale label and status word; the type ramp has no 11 rung |
| `--studio-git-menu-min-width` | `160px` | the pill's dropdown, measured off the design's open-menu instances |
| `--studio-git-divider-gap` | `10px` | either side of the pill's segment divider, so a PR pill's outer edges match its inner gaps; the spacing ramp has 8 and 12. The chevron's divider uses 6 (`--spacing-1-5`) |
| `--studio-git-skeleton-width` | `56px` | FILLED: the design draws no first-paint loading state. Fitted to the rendered "Create PR" at Inter Medium 12, so the pill barely moves when the label lands. The bar's height is `--text-supporting-size` |

The first-paint bar re-points `--color-skeleton` to `--studio-git-neutral-hue` on the element
rather than setting a background, because the library's prefers-contrast rule reads
`--color-skeleton`. Card scale reuses `--studio-attachment-pill-height` (22px). The chrome label
is `--text-supporting-size`, not `--text-body-size`, which this theme resolves to 13px. The inside
border and the divider read `--border-width` (0.5px).

The design places the tooltip 6px below the pill; the git tooltip takes the app's global 8px
(§16). Stale keeps its hue and drops to the dimmed treatment: the hue at 50% through `color-mix`,
no fill. Never element opacity, which measures 2.5:1 on the card ground.

## 19. Window tab strip: the sizing floor (ONL-2205)

The design pins every tab at `min-w-[200px] max-w-[200px]`, so the file draws one tab width: the
ceiling. A long name grows to 200 and then fades. The floor is not in the file.

| Value | Chosen | Status |
|---|---|---|
| `TAB_WIDTH` | `200px` | the design's own width |
| `MIN_TAB_WIDTH` | `128px` | **FILLED**, derived below |

**Eight characters of a real name read at the floor.** Measured at the label's computed font,
Inter Variable 500 at 12px, the widest eight-character prefix among the design's own tab names is
60.68px:

```
25.00  two 12px paddings + the tab's two 0.5px rules
40.00  the ✕'s 24, plus the 16 the mask takes to reach zero before it
60.68  the widest eight-character prefix, Inter Variable 500 12px
------
125.68  →  MIN_TAB_WIDTH = 128
```

A degenerate string (`WWWWWWWW`) is not the input; the rule says a real name. Re-derive the floor
if the label's type or the fade length changes (`chrome/tabs/geometry.ts`).

**The label's overflow is a gradient mask, not an ellipsis**, a deliberate divergence from the
design's `text-ellipsis`: the app dissolves the tail. The mask reaches fully transparent at the
overlay's leading edge, not the label's own, so the ✕ overlays the faded tail instead of taking
width from it; the label runs the tab's full inner width, and showing the ✕ on hover moves
nothing (`chrome/tabs/Tab.tsx`).

**The `+` pins against the right-hand controls**, as the design draws it. The bar's spacer after
the strip is `flex: 1 0 0`: it fills an emptier bar and closes to nothing under a full one. It
belongs to the bar, not the strip, so the strip knows nothing about what sits to its right.

**LEFT: the strip's ground.** The design's tab row sits on `bg/background` (#000000) and its band
on `bg/toolbar-base` (#000000d9). This theme has no `toolbar-base` equivalent, so the strip
inherits the band's `--studio-band`, and an overflowing strip fades the tabs themselves with a
mask rather than painting a scrim (`chrome/tabs/TabStrip.tsx`).

## 20. The band's controls: the design's fractional values, rounded (ONL-2236)

The band draws its icon buttons at 32.4 × 32.4 with `p-[7.2px]` and `rounded-[4.8px]`, around an
18 × 18 glyph: a 1.2 scale applied to a 27 / 6 / 4 / 15 set. The file carries no token for any
of them.

| Design value | Shipped | Status |
|---|---|---|
| button width `32.4` | `32` | **FILLED**: nearest whole point, down |
| glyph `18 x 18` | Astryx `size="md"` = 20 | **CONFLICT**: the icon scale has no 18 |
| button radius `4.8px` | `var(--radius-element)` | **FILLED**: the existing token |
| button padding `7.2px` | not set; the box centres its glyph | **LEFT** |

**The glyph.** Astryx's icon scale is `xsm 12 / sm 16 / md 20 / lg 24`; 16 and 20 are equidistant
from 18. `md` wins on consistency: it is the library's default, and `sm` would make the band's
glyphs the smallest icons in the app for no reason the design states. **open:** if 18 was meant,
the fix is a token, not a hardcoded 18, which would be the first icon sized outside the scale.

The band's inset and the gap between band-level items are the file's 8, shipped as drawn.

---

## 21. How `neutralTheme`'s palette is derived (ONL-2394)

`neutralTheme` (`apps/studio/src/theme/neutralTheme.ts`) is `studioTheme`'s base, and overrides
only the tokens that differ from Astryx core's defaults. Nothing in it comes from the design
file: it is a generated palette, and §3's blank rows (the categorical hues, the status palette,
the syntax tokens) are where `studioTheme` inherits it unchanged.

### The spine and the tonal-stop rule

The grayscale spine is a common utility-CSS framework's neutral scale, at chroma 0:

```
50:#fafafa  100:#f5f5f5  200:#e5e5e5  300:#d4d4d4  400:#a3a3a3  500:#737373
600:#525252 700:#404040  800:#262626  900:#171717  950:#0a0a0a
```

The chromatic palette is OKLCH-derived, evenly spaced on the hue wheel. Token tonal stops,
light/dark: **bg T90/T20, border T80/T30, icon and text T30/T80.**

### Per-hue sources

| Hue | H | Source |
|---|---|---|
| Red | 22 | `#eb183a` |
| Orange | 55 | `#d57113` |
| Yellow | 90 | `#f8c723` |
| Green | 144 | `#358a3a` |
| Teal | 180 | `#0c7365` |
| Cyan | 215 | `#0c6f82` |
| Blue | 255 | `#0074e2` |
| Purple | 320 | `#980fb2` |
| Pink | 355 | `#b10e69` |

Gray is the categorical neutral at chroma 0.

### The two transforms

Per-token stops for the categorical family: **bg** light T87–90 pastel / dark T70 hue at 24%
alpha; **border** T80 / T60; **icon and text** T30 / T70–80.

- **Light pastels** use a per-hue chroma table, so the hues read at equal perceived saturation
  rather than equal numeric chroma.
- **Dark slots** are HCT-derived from each row's source hex: **chroma × 0.85, +5 tone lift,
  tapering across 80–95.**

Three hues come off the canonical ramp, all for the green-cyan-yellow luminance overshoot, where a
hue at the shared L reads louder than its neighbours:

| Hue | Departure | Why |
|---|---|---|
| Yellow | light pastel at **H=85 C=0.085 L=0.90** | yellow sits at the luminance peak; dark stays canonical |
| Teal | light pastel at **L=0.87 C=0.065**, a step below the other hues | same overshoot |
| Cyan | same **L=0.87 C=0.065** as teal | same overshoot |

**Blue T50 `#0074e2` is reserved** for the filled Info badge, the progressbar and the inset hover;
it is not a categorical stop.

### The status pair inverts between modes

`--color-X` is the saturated text/icon stop and `--color-X-muted` the ground it sits on, and the
pair inverts between light and dark so light pastels never glow against a dark body. The dark
`-muted` values are a hue-tinted alpha overlay (`3D` = 24%), not a solid panel, so the surface
composites onto whatever it sits on. The categorical family takes the same inversion.

### Backgrounds

Flat, with one lifted surface. Dark mode collapses card / popover / muted onto body T10 and lifts
them with shadow and an inset highlight instead of tone. `--color-background-surface` is one step
lighter, because switches, radios, checkboxes, dialogs and app shells read it as a control or
panel fill that sits above the canvas.

### Syntax palette

The 14 `--color-syntax-*` tokens are the OKLCH **T30 (light) / T80 (dark)** stops of the
categorical ramps, the same colours `--color-icon-*` carries: keyword and type → purple; string →
green (saturated T30 / pastel T80); number and constant → orange; function → blue H=255; tag →
red; attribute → yellow; property → teal; variable → near-black/near-white; comment, operator and
punctuation → neutral.

### The non-colour derivations

| Block | Derivation |
|---|---|
| Typography | Figtree across body, heading and display; monospace stays the platform default. Scale `base=14 ratio=1.2`, bold h3/h4 for subsection hierarchy. |
| Motion | Snappier than core's default, matching common component-library conventions. |
| Radius | Slightly larger than core's default. |
| Shadows | Dark mode adds an all-around 1px white inset, because a drop shadow alone cannot lift a surface off a dark canvas. The inset layer is `light-dark(transparent, …)`, so light mode is unaffected. `studioTheme` zeroes both insets (§3). |
| Heading and text | Generated by `typography.scale`; no overrides. |

### Why each component override exists

| Component | Override | Reason |
|---|---|---|
| `badge` semantic variants | literal hex fills | A downstream theme cannot re-point them by token; it displaces them at the call site that chooses the variant. The categorical variants reference the per-hue tokens and track the palette. |
| `badge` `variant:neutral` | sourced from the gray hue tokens | One token change moves it and the gray categorical variant together. |
| `statusdot` | redirected to the filled badge stops | The component maps each variant to a raw semantic token, which in light mode is the dark stop meant as text on a pastel; as a solid dot those read muddy. The redirect makes a dot and its badge speak one status language. |
| `banner` | hue-tinted ground from `--color-{X}-muted`, ink from `--color-text-{hue}` | Both halves track the palette. |
| `switch` | off-state track borrows the ProgressBar track's surface | Both channel-on-body components read as a defined channel rather than a wash. |
| `progressbar` base | `--color-background-muted` re-pointed | The track otherwise reads the body background and blends in. |
| `progressbar` variants | vivid stops | Match the filled semantic badge fills. |
| `card`, `section` | tighter padding through the public padding tokens | — |

---

## 22. The inline element bubble (ONL-2455)

The file does not show this surface, so the surface type's convention carries what it can, and
each value chosen here is a row.

| Value | Status | What was chosen | Why |
|---|---|---|---|
| Bubble width | **FILLED** | `280px` | A top-layer box is shrink-to-fit, so without a definite width the bubble re-flows on every keystroke. 280 is the chat panel's minimum width, so the two read as one family. `INLINE_BUBBLE_WIDTH` in `canvas/inlinePlacement.ts` holds it, because the canvas keeps the surface inside its Frame before the surface exists to measure. |
| Bubble radius | **FILLED** | half the one-row card, `(22px + 8px) / 2 + 6px`, held as the card grows; `--radius-page` is the composer's fallback | The card reads as a pill at one row (`.inline-morph-content`, `canvas/canvas.css`). The open card's corners take `corner-shape: superellipse(1.5)`, as the canvas toolbar does. |
| Surface | **FILLED** | an opaque `--color-background-card` ground and a `0.5px` `--color-border` hairline on the morphing shape, with a `drop-shadow(0 8px 10px #00000080)` | The theme sets the composer's fill to transparent so the chat panel reads as one surface; the bubble inherited that and showed the page through it. The shape carries the ground, the hairline and the radius, so they are exact on every frame of the morph. |
| Grow ceiling | **LEFT**, open | the library's 8-row `maxRows` | Not chosen here; 8 rows on a 280px floating bubble may be too tall. |
| Element-to-bubble gap | **LEFT** | `8px` screen, held across zoom (`INLINE_BUBBLE_GAP`) | No spacing token reaches a value painted outside the viewport transform, so it is divided by the camera zoom, as the frame ring's stroke is. `--spacing-2` is the same 8px. |
| Flip reserve | **LEFT** | `96px` of pane (`INLINE_BUBBLE_RESERVE`) | The room a side needs before the bubble takes it: the resting bubble, the gap and one chip row. Measured off the resting composer, so it moves if the grow ceiling does. |
| Gesture tolerance | **LEFT** | `3px` of pointer travel (`GESTURE_TOLERANCE`, `canvas/Canvas.tsx`) | One number for React Flow's click distance and its drag threshold, which ship as 0 and 1; two values open a band where the Frame moves and a pick also fires. |
| Layout | **FILLED** | one row: the input takes the width and send sits at its end; once the draft wraps, send drops to the lower right | The composer's stock two rows left a tall, mostly empty card for a one-line prompt. |
| Orb and input morph | **FILLED** | One persistent surface, always card-sized; a single shape element's width and height ride springs that keep their velocity (`useOrbMorph`). Open: width `k 640, ζ 0.80` leads height `k 380, ζ 0.90`, so it stretches wide before it fills. Close: height `k 800, ζ 0.80` leads width `k 700, ζ 0.80`, so it drops to a pill before it zips in. The input's clip and opacity and the sparkles' fade and turn are functions of the shape's size, not timers. A reversal keeps its momentum; reduced motion snaps. | Stitched keyframes restart their speed at every segment, two swapped elements never match at the handoff, and separate timers drift. One physical system with derived channels has none of those seams. |
| Entry and exit motion | **FILLED** | In: `220ms` `cubic-bezier(0.34, 1.3, 0.64, 1)` from `translateY(6px toward the element) scale(0.96, 0.9)`, opacity over `110ms`. Out: a dismissal sinks back into the element in `120ms` ease-in; a send tucks toward it, then lifts `9px` away in `170ms`. Reduced motion: opacity only. | The bubble belongs to one element, so it grows from that element's side. The overshoot is about a 1% scale, enough to settle into place without visibly bouncing. The two exits tell a send from a dismissal without a toast. The exit lengths live once, in `INLINE_CHAT_EXIT_MS`. No motion token exists for a spring, so these are bare values. |

## 23. Project card thumbnail: the arrival (ONL-2471)

The design draws the composed image in place and cannot draw the moment it arrives. The rest of
the slot is answered: the ratio is §12's 273:140, the 12px margin is baked into the stored image,
the ground is the placeholder's `--color-background-muted`, and the top corners come from the
card's `overflow: hidden` with `--radius-container`.

| Value | Status | What was chosen | Why |
|---|---|---|---|
| Thumbnail fade-in | **FILLED** | `--duration-fast-max` (165ms) `cubic-bezier(0.24, 1, 0.4, 1)`, opacity only, keyed on the image's `load`; reduced motion is immediately opaque | The image is lazy, so mount and paint are different moments and a mount-time fade plays against an empty box. 165ms is the top of the theme's fast family: long enough to read as an arrival, short enough that a grid of them does not ripple. The curve is the one the app's other fades use. |

## 24. The Canvas screen's icon rail and the code view (ONL-2563)

| Value | Status | What was chosen | Why |
|---|---|---|---|
| Rail sits outside the stored panel width | **FILLED** | the stored width is the panel body's; the aside is the rail plus that | Folding the rail into the stored width would take its width off every width already saved, and `restingFitOptions` reads that number to place a Frame clear of the panel. |
| Code view default width | **FILLED** | `440px` (`REGION.code`, `PANEL_DEFAULTS.code`) | The mock's own number. |
| Code view min–max | **FILLED** | `280–900` (`PANEL_LIMITS.code`) | The min matches the chat panel's; the max is judgement: a code panel is read at widths the designs list never needs, so it has its own ceiling. |
| Files and Code glyphs | **FILLED** | the family's `IconFiles` and `IconCode` | Transcribed from the mock's own imports. |
| The mark in the rail's head | **FILLED** | the Onlook logomark (`icons/OnlookMark.tsx`), `currentColor`, clipped to its own circle at `20px` | The mock's own drawing. The clip path takes a `useId`, because SVG ids are document-global. |
| The rule under the mark | **FILLED** | a `Divider` `24px` wide | The mock's number. It separates the mark from the views, which it is not one of; a rule across the rail's whole width would read as a second border beside the panel's own. |
| The code view's empty line | **FILLED** | `code.panel.empty`, centred, in the supporting type at the secondary ink | A blank panel reads as a failure rather than as an empty one. |
| What the floating canvas controls measure from | **FILLED** | the canvas between the two panels, not the window | The Design/Preview switch centres on that span. Centred on the window it would sit inside the left panel at any code width past half the window, and the panels are overlays, so nothing else moves it out. |
| When the corner yields | **FILLED** | below `480px` of canvas (`CORNER_YIELDS_BELOW`, `canvas/cornerPlacement.ts`), the guide's invitation is not drawn | The tool bar centres on the same canvas and is content-sized, so on a narrow canvas it reaches the corner. An invitation sitting on the Select tool is worse than none. A judged number, not a drawn one. |

## 25. The code view's syntax palette (ONL-2563)

The theme leaves its syntax tokens inherited (§3). The code view needs a palette, and the mock
supplies one as a mapping onto the text family. The properties live in `styles.css` as
`--studio-syntax-*`, since `TokenName` is closed.

They are named by role, never by hue: a reader needs to know which role a colour marks, and a hue
name goes stale the moment the value moves.

| Value | Status | What was chosen | Why |
|---|---|---|---|
| keyword | **FILLED** | `--color-text-teal` | The mock's mapping. Keywords are the structure a reader scans first. |
| type | **FILLED** | `--color-text-blue` | The mock's mapping. Types and components are the other thing scanned, and blue already marks a name elsewhere in the product. |
| string | **FILLED** | `--color-text-orange` | The mock's mapping. Warm without going red, which is reserved for failure. |
| number | **FILLED** | `--color-text-purple` | The mock's mapping. Hex colours take this one too, so a value the swatch opens is marked as a value. |
| call | **FILLED** | `--color-text-yellow` | The mock's mapping. Warm like the string, because both are leaves rather than structure. |
| comment | **FILLED** | `--color-text-secondary`, italic, `opacity: 0.7` | The mock's mapping, opacity included (`code/codeTheme.ts`). |
| plain | **FILLED** | `--color-text-primary` | Unmarked code is ordinary text. |
| the mapped-line tint | **FILLED** | `--studio-teal-fill` as a line background | A background, not a border: a border reflows the row on every edit inside the tinted range. |
| line height | **FILLED** | `20px` | The mock's own number. |
| the gutter's ground | **FILLED** | `--color-background-surface`, the panel's own | CodeMirror pins the gutter with `position: sticky`, so a long line scrolled sideways passes under it; a see-through gutter draws code over the line numbers. |

## 26. The discover card in the Projects rail (ONL-2443)

The file does not show this surface, so the surface type's convention carries what it can. The
card is a growth nudge above the version row at the foot of the Projects rail, so every value is
picked to make it read as a rail element rather than a panel floating over one.

| Value | Status | What was chosen | Why |
|---|---|---|---|
| Card ground | **FILLED** | `variant="transparent"`, the rail's own ground | The rail's ground is `--studio-ground` #262626. Every darker fill reads as a recess cut into the rail: `Card`'s default `--color-background-card` is #1f1f1f, and `muted` is darker still. `gray` paints #333333, the value the star action resolves to, and a fill equal to its own control is the trap §3 records. A claim that a fill "sits with the rail" is checked by sampling the painted pixel (§0). |
| Card radius | **FILLED** | `--radius-element` (4px) | The rail's own rows round at this step (`rowGeometry.ts`). `Card`'s default `--radius-container` is the card-grid value and reads as a floating card in a rail. |
| Card padding | **FILLED** | step `3` (12px) | `Card`'s default step `4` is a card-grid value, too generous inside a rail whose own inset is already 24px. |
| Border | **FILLED** | `0.5px solid var(--color-border)` | With no fill, the hairline is what makes the card an object. `packages/onboarding-ui/src/HarnessTile.tsx` uses the same pair: `variant="transparent"` plus a border. |
| Copy block → action gap | **FILLED** | step `2` (8px) | One step tighter than the rail's section gap, so the title, the line under it and the action read as one object. |
| Title → body gap | **FILLED** | step `0.5` (2px) | The two lines are one message. |
| Star action | **FILLED** | `variant="secondary"`, `size="sm"`, `IconStar` leading | `secondary` resolves to #333333, one step brighter than the rail's ground, the chip convention (§3). `size="sm"` is 28px, the rail's `ROW_HEIGHT`. The glyph makes the row read as the call. `primary` would re-point to the inverted white and make a growth nudge the loudest thing on the Screen. |
| Accent | **LEFT** | none | The accent marks state, never importance (§3), and a growth nudge is importance. The only accent on the surface is the `:focus-visible` ring, which is state. |
| Timing | **FILLED**, open | shown only once at least one Project exists | The empty first-run screen would ask for a star before the product has given anything. `discoverCardVisible` requires a Project in any Workspace. Other timings, such as after a first Project Chat, need a product decision. |

## 27. The pointer over a menu, a picker and a menu-like popover (ONL-3181)

No frame shows a cursor, so each value here is a row. Astryx's `Item` sets `cursor: pointer`
through StyleX, which only the `app` layer outranks, so the rule decides it for every menu in the
product (`styles.css`).

| Value | Status | What was chosen | Why |
|---|---|---|---|
| Cursor over a menu, listbox or `menu-surface` row | **FILLED**, open | `default` (the arrow) | macOS menus, popup buttons and source lists keep the arrow; the hand is the web's convention for a link. A choice with no reference behind it, app-wide. |
| Cursor over a `button` or `a` inside one of those surfaces | **LEFT** | the library's own value | A real control is still a control inside a menu. |
| Cursor and selection over a field inside one of those surfaces | **FILLED** | `text`, selectable | Stated positively, so a search field inside a picker never inherits the row treatment. |
| Text selection inside those surfaces | **FILLED** | `none` | A row is pressed, never read off. |
| A line inside one that is read off | **FILLED** | `menu-selectable` opts back into `text` | The account menu's signed-in email is not a row, and a person copies it. The opt-in keeps the default honest instead of carving an exception into the rule. |
| What the rule covers | **FILLED** | `[role='menu']`, `[role='listbox']`, `.astryx-dropdown-menu`, `.menu-surface` | Role first, so a new menu or picker is covered the day it is written. `menu-surface` is the opt-in for a menu-like popover with neither role; the Add codebase popover (`role="dialog"`) takes it in ONL-3182. A modal dialog is outside it: its body is reading material. |

## 28. Component overrides: banners, the chat panel and controls

The file does not show these states, or the library paints them differently from the rest of the
product. Each row is a `components` entry in the theme.

| Value | Status | What was chosen | Why |
|---|---|---|---|
| Banner, every status | **FILLED** | the app's own surface and foreground: the four `*-muted` grounds re-point at `--color-background-popover` on `banner`, each `status:*` variant sets the ink, and `banner-icon` re-points the four status colours at `--color-icon-primary` | §16's rule for a toast, applied to a Banner: the words carry the state. Core paints the header from one `*-muted` ground per status and colours the glyph from the status colour; the theme sets none of them, so each would fall through to the base theme's pale reds and greens. `status` still selects `role="alert"` or `role="status"`. It applies to every Banner in the app, and not to the transcript's error ink below. |
| Chat panel accent | **FILLED** | monochrome: on `chat-layout` the four accent slots re-point at neutrals (`--color-accent` → `--color-background-gray`; `--color-on-accent`, `--color-text-accent` and `--color-icon-accent` → the primaries) and `--color-success` → `--color-text-secondary` | The accent already marks state in the chrome (§3); a second use inside the chat makes the panel loud, so colour there is opt-in. The re-points sit on `.astryx-chat-layout`, so they reach every component inside the panel and nothing outside it. #333333 is the design's top rung, so a primary action still reads as a filled control. |
| Chat panel error ink | **LEFT** | `--color-error` is not re-pointed | Failure is the one thing in a transcript that should stand out before it is read. |
| Chat panel chips | **LEFT** | the categorical ramps are not re-pointed | A `Chip` takes its ground and ink from the blue and teal families by meaning, so the welcome turn keeps its colour. The monochrome rule covers what renders per turn. |
| Chat panel `warning` and `error` Badge | **open** | nothing; no chat surface uses either | Astryx compiles both variants to a literal `background-color`, which a re-point cannot reach (ONL-1939). A fix belongs at the call site that picks one; `components.badge` is global. |
| Assistant bubble (`variant:ghost`) | **FILLED** | `--color-text-gray` ink, no inline padding | Inline padding marks nothing on a transparent ground; the block padding still spaces turns apart. |
| User bubble corners | — | all four at `--radius-chat` | The sketch squares the sender corner; at the bubble's width that reads as a clipped edge rather than a tail. |
| Button motion | **FILLED** | `transition: none` on `button` and on the other controls with state colours | A state change lands instantly. Core's base transitions five properties together, which cross-fades a toggle's persistent selected fill along with the hover wash. |
| Neutral button ink (`variant:ghost`) | **FILLED** | `--color-icon-secondary` at rest, `--color-icon-primary` on hover and active | These are mostly icon buttons, so they take the icon ladder. `primary` and `destructive` keep their own ink; `secondary` is §16. |
| Indeterminate checkbox | **FILLED** | the control fill with an accent border and an accent dash | Core routes checked and indeterminate through one style, so a mixed box takes the solid accent fill and reads as all-on. |
| Menu item focus | **FILLED** | `:focus` paints nothing; `:focus-visible` and `:hover` take the hover wash and `--color-on-dark` ink | The library focuses the first item when a menu opens, so a plain `:focus` rule paints a selection the user did not make. |
| `Kbd` | **FILLED** | no bottom border; the cap is its fill alone | The library's 2px `--color-border-emphasized` key edge is the brightest line on a menu panel, and a 1px one still reads as a stray underline. |
| Tooltip type and inset | **FILLED** | `--text-supporting-size`, the inset one spacing step tighter, `--radius-element` | A tooltip carries two or three words; core's default sets it in body-sized type. The margin and the max width are §16. |
