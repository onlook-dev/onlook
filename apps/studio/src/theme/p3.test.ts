import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS = readFileSync(
  fileURLToPath(new URL('../renderer/src/styles.css', import.meta.url)),
  'utf8',
);

const THEME = readFileSync(
  fileURLToPath(new URL('./studioTheme.ts', import.meta.url)),
  'utf8',
);

/** The blue family, pushed past its hex into the wider gamut on purpose; every other token stays its own hex, renormalised. */
const WIDENED = new Set([
  '--studio-blue-hue',
  '--studio-blue-ink-dim',
  '--studio-blue-fill-dim',
  '--color-background-blue',
  '--color-text-blue',
  '--color-border-blue',
  '--color-icon-blue',
]);

function p3Block(): string {
  const start = CSS.indexOf('@supports (color: color(display-p3 1 1 1))');
  expect(start).toBeGreaterThan(-1);
  return CSS.slice(start, CSS.indexOf('\n  }\n', start));
}

function expand(hex: string): string {
  const body = hex.slice(1);
  return body.length === 3
    ? `#${body.split('').map((c) => c + c).join('')}`.toLowerCase()
    : hex.toLowerCase();
}

function hexDeclarations(): Map<string, string> {
  const out = new Map<string, string>();
  const scan = (source: string, pattern: RegExp): void => {
    for (const [, name, hex] of source.matchAll(pattern)) {
      if (name !== undefined && hex !== undefined && !out.has(name)) out.set(name, expand(hex));
    }
  };
  scan(CSS, /(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g);
  scan(THEME, /'(--[\w-]+)':\s*'(#[0-9a-fA-F]{3,8})'/g);
  return out;
}

function channels(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

describe('the display-p3 branch', () => {
  const block = p3Block();
  const hexes = hexDeclarations();

  const overrides = [...block.matchAll(/(--[\w-]+):\s*color\(display-p3\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)];

  test('states at least one colour, so a silent empty block cannot pass', () => {
    expect(overrides.length).toBeGreaterThan(0);
  });

  const exact = overrides.filter((m) => !WIDENED.has(m[1] ?? ''));
  const widened = overrides.filter((m) => WIDENED.has(m[1] ?? ''));

  test('every widened token is still in the block, so a stale name cannot hide in the list', () => {
    expect(widened.map((m) => m[1]).sort()).toEqual([...WIDENED].sort());
  });

  test.each(widened.map((m) => [m[1] ?? '', m.slice(2, 5).map(Number) as number[]] as const))(
    '%s is a real P3 colour with an sRGB hex behind it for other displays',
    (name, coordinates) => {
      expect(hexes.get(name), `${name} has a display-p3 value but no sRGB hex to fall back to`).toBeDefined();
      for (const value of coordinates) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    },
  );

  test.each(exact.map((m) => [m[1] ?? '', m.slice(2, 5).map(Number) as number[]] as const))(
    '%s renormalises its own sRGB hex, not a different colour',
    (name, coordinates) => {
      const hex = hexes.get(name);
      expect(hex, `${name} has a display-p3 value but no sRGB hex to fall back to`).toBeDefined();
      const expected = channels(hex ?? '#000000');
      coordinates.forEach((value, index) => {
        // The stylesheet's precision; a wider tolerance lets a different colour pass.
        expect(value).toBeCloseTo(expected[index] ?? 0, 4);
      });
    },
  );

  test('is gated on the display, not only on the engine parsing color()', () => {
    expect(block).toContain('@media (color-gamut: p3)');
  });

  const repoints = [...block.matchAll(/(--color-[\w-]+):\s*var\((--[\w-]+)\)/g)];

  test('re-points at least one theme token, so a silent empty match cannot pass', () => {
    expect(repoints.length).toBeGreaterThan(0);
  });

  test.each(repoints.map((m) => [m[1] ?? '', m[2] ?? ''] as const))(
    '%s re-points at %s, which holds the hex the theme declares',
    (token, target) => {
      const themeHex = THEME.match(new RegExp(`'${token}':\\s*'(#[0-9a-fA-F]{3,8})'`))?.[1];
      expect(themeHex, `${token} has no hex in studioTheme.ts`).toBeDefined();
      expect(hexes.get(target)).toBe(expand(themeHex ?? ''));
    },
  );
});
