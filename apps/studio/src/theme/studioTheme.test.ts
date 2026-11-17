// `tsconfig.theme.json` sets `types: []`; this opts one file into Bun's test types
// without widening that project.
/// <reference types="bun" />
import { describe, expect, it } from 'bun:test';
import { studioTheme } from './studioTheme.js';

const FILL_TOKENS = ['--color-skeleton', '--color-background-gray', '--color-track'] as const;

const GROUND_TOKENS = [
  '--color-background-body',
  '--color-background-muted',
  '--color-background-card',
  '--color-background-popover',
] as const;

function assertFillDistinctFromGround(tokens: Record<string, string>): void {
  for (const fill of FILL_TOKENS) {
    for (const ground of GROUND_TOKENS) {
      if (tokens[fill] === tokens[ground]) {
        throw new Error(
          `${fill} (${tokens[fill]}) equals ${ground} (${tokens[ground]}) — a fill token must never match a ground token`,
        );
      }
    }
  }
}

describe('studioTheme fill-versus-ground tokens', () => {
  it('keeps every fill token distinct from every ground token', () => {
    expect(() => assertFillDistinctFromGround(studioTheme.tokens)).not.toThrow();
  });
});
