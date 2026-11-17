/** Read from the live stylesheets, not from a list here. */
import { useEffect, useMemo, useState } from 'react';
import { HStack, Stack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';

import type { Category, Gallery } from './Showroom.js';

interface Swatch {
  name: string;
  declared: string;
  resolved: string;
  /** Painted by the engine, not computed. */
  srgb: string;
  /** 0–1. */
  luminance: number;
  isWideGamut: boolean;
  floatsWithOs: boolean;
  aliasOf: string | null;
}

const VAR_TARGET = /^var\(\s*(--[\w-]+)/;

function declarations(): Map<string, string> {
  const declared = new Map<string, string>();
  const visit = (rules: CSSRuleList): void => {
    for (const rule of rules) {
      /* Recurse into grouping rules, or everything inside @layer and @media goes uncounted. */
      if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules);
      const style = (rule as CSSStyleRule).style as CSSStyleDeclaration | undefined;
      if (!style) continue;
      for (const property of style) {
        // Later declarations win, matching the cascade for same-specificity roots.
        if (property.startsWith('--')) declared.set(property, style.getPropertyValue(property).trim());
      }
    }
  };
  for (const sheet of document.styleSheets) {
    // An unreadable sheet throws rather than returning empty; one must not take the census with it.
    try {
      visit(sheet.cssRules);
    } catch {
      continue;
    }
  }
  return declared;
}

/** Canvas keeps the previous fillStyle on a value it cannot parse, so reset it first. */
function toPaintable(value: string): string {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  probe.style.backgroundColor = value;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return computed === '' ? value : computed;
}

function painted(value: string): { srgb: string; luminance: number } | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = toPaintable(value);
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  const hex = (n: number): string => n.toString(16).padStart(2, '0');
  return {
    srgb: `#${hex(r)}${hex(g)}${hex(b)}`,
    luminance: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255,
  };
}

function readSwatches(): Swatch[] {
  const root = getComputedStyle(document.documentElement);
  const declared = declarations();
  const out: Swatch[] = [];
  for (const [name, authored] of declared) {
    const resolved = root.getPropertyValue(name).trim();
    if (resolved === '') continue;
    // A regex over hex and `rgb(` misses `color()`, `color-mix()` and every named color.
    if (!CSS.supports('color', resolved)) continue;
    const paint = painted(resolved);
    if (paint === null) continue;
    out.push({
      name,
      declared: authored,
      resolved,
      srgb: paint.srgb,
      luminance: paint.luminance,
      isWideGamut: resolved.startsWith('color('),
      floatsWithOs: resolved.includes('light-dark('),
      aliasOf: VAR_TARGET.exec(authored)?.[1] ?? null,
    });
  }
  return out;
}

interface Family {
  id: string;
  title: string;
  note: string;
  match: (s: Swatch) => boolean;
}

const RAMPS: Family[] = [
  { id: 'blue', title: 'Blue', note: 'kind — the HTML artifact accent, and the git Download hue', match: (s) => s.name.startsWith('--studio-blue') },
  { id: 'teal', title: 'Accent roles', note: 'state — the stops Astryx’s two accent slots cannot hold; teal on the canvas only', match: (s) => s.name.startsWith('--studio-accent') || s.name.startsWith('--studio-on-accent') },
  { id: 'git', title: 'Git status', note: 'hue/tint pairs; chromatic status lives in git scope only', match: (s) => s.name.startsWith('--studio-git') },
];

const SEMANTIC: Family[] = [
  { id: 'accent', title: 'Accent', note: 'state: running, selected, current, checked, focused', match: (s) => s.name.includes('accent') },
  { id: 'text', title: 'Text', note: 'five design tiers into three slots — see the register', match: (s) => s.name.includes('text') },
  { id: 'icon', title: 'Icon', note: '', match: (s) => s.name.includes('icon') },
  { id: 'background', title: 'Background', note: '', match: (s) => s.name.includes('background') },
  { id: 'border', title: 'Border', note: '0.5px hairlines do the structural work', match: (s) => s.name.includes('border') },
  { id: 'overlay', title: 'Overlay and wash', note: 'alpha — shown on a checkerboard', match: (s) => s.name.includes('overlay') || s.name.includes('tint') || s.name.includes('shadow') || s.name.includes('skeleton') || s.name.includes('track') || s.name.includes('neutral') },
  { id: 'status', title: 'Status', note: 'only danger is set; the rest are left inherited on purpose', match: (s) => s.name.includes('error') || s.name.includes('warning') || s.name.includes('success') },
];

const APP_REST: Family = { id: 'app-rest', title: 'App-level, unramped', note: 'a color with no family — the shape a future ramp starts as', match: () => true };

let census: Swatch[] | null = null;

function useFamilies(): Map<string, Swatch[]> | null {
  const [ready, setReady] = useState(census !== null);
  useEffect(() => {
    /* After mount: a render-time read returns an empty census on first paint. */
    census ??= readSwatches();
    setReady(true);
  }, []);
  return useMemo(() => {
    if (!ready || census === null) return null;
    const byFamily = new Map<string, Swatch[]>();
    const taken = new Set<string>();
    const assign = (families: Family[], pool: Swatch[]): void => {
      for (const family of families) {
        const members = pool
          .filter((s) => !taken.has(s.name) && family.match(s))
          .sort((a, b) => a.luminance - b.luminance);
        members.forEach((s) => taken.add(s.name));
        byFamily.set(family.id, members);
      }
    };
    const app = census.filter((s) => !s.name.startsWith('--color-'));
    const semantic = census.filter((s) => s.name.startsWith('--color-'));
    assign(RAMPS, app);
    byFamily.set(APP_REST.id, app.filter((s) => !taken.has(s.name)).sort((a, b) => a.luminance - b.luminance));
    app.forEach((s) => taken.add(s.name));
    assign(SEMANTIC, semantic);
    return byFamily;
  }, [ready]);
}

/** Alpha reads as opaque over one flat ground, and several of these are washes. */
const CHECKER = {
  backgroundImage:
    'linear-gradient(45deg, #3a3a3a 25%, transparent 25%), linear-gradient(-45deg, #3a3a3a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3a3a3a 75%), linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
} as const;

const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, monospace' } as const;

function SwatchRow({ swatch }: { swatch: Swatch }): React.JSX.Element {
  return (
    <HStack gap={3} vAlign="center" style={{ width: '100%' }} data-testid={`swatch-${swatch.name}`}>
      <Stack style={{ ...CHECKER, width: 44, height: 28, borderRadius: 'var(--radius-element)', flexShrink: 0, border: '0.5px solid var(--color-border)' }}>
        <Stack style={{ width: '100%', height: '100%', background: swatch.resolved, borderRadius: 'var(--radius-element)' }} />
      </Stack>
      <Text type="supporting" color="primary" style={{ ...MONO, width: 250, flexShrink: 0 }} maxLines={1}>
        {swatch.name.replace(/^--/, '')}
      </Text>
      <Text type="supporting" style={{ ...MONO, color: 'var(--color-text-secondary)', width: 88, flexShrink: 0 }}>
        {swatch.srgb}
      </Text>
      <HStack gap={1} style={{ width: 62, flexShrink: 0 }}>
        {swatch.isWideGamut ? (
          <Text type="supporting" style={{ ...MONO, color: 'var(--studio-blue-hue)', border: '0.5px solid var(--studio-blue-hue)', borderRadius: 'var(--radius-element)', padding: '0 4px' }}>
            P3
          </Text>
        ) : null}
        {swatch.floatsWithOs ? (
          <Text type="supporting" style={{ ...MONO, color: 'var(--color-text-disabled)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-element)', padding: '0 4px' }}>
            OS
          </Text>
        ) : null}
      </HStack>
      <Text type="supporting" style={{ ...MONO, color: 'var(--color-text-disabled)', minWidth: 0 }} maxLines={1}>
        {swatch.aliasOf === null ? swatch.declared : `\u2192 ${swatch.aliasOf.replace(/^--/, '')}`}
      </Text>
    </HStack>
  );
}

function FamilyRows({ familyId, note }: { familyId: string; note: string }): React.JSX.Element {
  const families = useFamilies();
  if (families === null) return <Text>Reading the stylesheets…</Text>;
  const members = families.get(familyId) ?? [];
  if (members.length === 0) return <Text type="supporting" style={{ color: 'var(--color-text-disabled)' }}>None.</Text>;
  return (
    <VStack gap={2} style={{ width: '100%', maxWidth: 880 }} data-testid={`color-family-${familyId}`}>
      <Text type="supporting" style={{ color: 'var(--color-text-disabled)' }}>{`${String(members.length)} · ${note}`}</Text>
      <VStack gap={1} style={{ width: '100%' }}>
        {members.map((s) => (
          <SwatchRow key={s.name} swatch={s} />
        ))}
      </VStack>
    </VStack>
  );
}

function Overview(): React.JSX.Element {
  const families = useFamilies();
  if (families === null || census === null) return <Text>Reading the stylesheets…</Text>;
  const all = census;
  const line = (label: string, value: string): React.JSX.Element => (
    <HStack gap={2} key={label}>
      <Text type="supporting" style={{ color: 'var(--color-text-disabled)', width: 150, flexShrink: 0 }}>{label}</Text>
      <Text type="supporting" color="primary">{value}</Text>
    </HStack>
  );
  return (
    <VStack gap={3} style={{ maxWidth: 720 }} data-testid="color-overview">
      <VStack gap={1}>
        {line('Total', `${String(all.length)} custom properties resolve to a color`)}
        {line('Wide gamut', `${String(all.filter((s) => s.isWideGamut).length)} in display-p3`)}
        {line('Floats with the OS', `${String(all.filter((s) => s.floatsWithOs).length)} still carry a light/dark pair`)}
        {line('Pointers', `${String(all.filter((s) => s.aliasOf !== null).length)} point at another property; the rest are decisions`)}
        {line('This display', matchMedia('(color-gamut: p3)').matches ? 'wide gamut — the P3 rows show their real reach' : 'sRGB — the P3 rows clip to the hex beside them')}
      </VStack>
      <Text type="supporting" style={{ color: 'var(--color-text-disabled)' }}>
        Astryx generates a primitive scale from `color:` and layers semantic `tokens` over it. This theme sets no `color:` block, so there is no generated tier — every semantic token holds its value directly, and the only ramps are the app’s own.
      </Text>
      <Text type="supporting" style={{ color: 'var(--color-text-disabled)' }}>
        OS — inherited from the base theme, never spoken about by the design, and still carrying a light/dark pair. The app pins dark, so these are the tokens whose value is not ours to predict.
      </Text>
    </VStack>
  );
}

function story(id: string, title: string, note: string): { id: string; title: string; render: () => React.ReactNode } {
  return { id: `color-${id}`, title, render: () => <FamilyRows familyId={id} note={note} /> };
}

const CATEGORIES: Category[] = [
  {
    id: 'overview',
    title: 'Overview',
    stories: [
      {
        id: 'color-overview',
        title: 'How this theme is built',
        note: 'read from the live stylesheets at mount — a minted color appears here without anyone adding it',
        render: () => <Overview />,
      },
    ],
  },
  {
    id: 'ramps',
    title: 'Ramps — the app’s own families',
    stories: RAMPS.map((f) => story(f.id, f.title, f.note)).concat(story(APP_REST.id, APP_REST.title, APP_REST.note)),
  },
  {
    id: 'semantic',
    title: 'Semantic tokens — Astryx’s named roles',
    stories: SEMANTIC.map((f) => story(f.id, f.title, f.note)),
  },
];

export const COLOR_GALLERY: Gallery = {
  id: 'color',
  title: 'Color',
  subtitle: 'Every custom property the running app resolves to a color: the app’s ramps, then Astryx’s semantic tokens, each with its sRGB fallback and whether it points at another token.',
  categories: CATEGORIES,
};
