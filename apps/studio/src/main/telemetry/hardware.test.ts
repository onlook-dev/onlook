import { describe, expect, it } from 'bun:test';
import { cpuFamily, underRosetta } from './hardware.js';

describe('CPU family buckets', () => {
  for (const generation of [1, 2, 3, 4] as const) {
    for (const tier of ['', ' Pro', ' Max', ' Ultra']) {
      it(`buckets Apple M${generation}${tier} without exposing the model`, () => {
        expect(cpuFamily(`Apple M${generation}${tier}`)).toBe(`apple-m${generation}`);
      });
    }
  }

  for (const model of [
    'Intel(R) Core(TM) i5-8259U CPU @ 2.30GHz',
    'Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz',
    'Intel(R) Core(TM) i9-9980HK CPU @ 2.40GHz',
    'Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz',
  ]) {
    it(`buckets ${model} as intel`, () => {
      expect(cpuFamily(model)).toBe('intel');
    });
  }

  for (const model of ['Apple M5 Pro', 'Apple M10 Max', 'Apple Unknown']) {
    it(`buckets ${model} as apple-other`, () => {
      expect(cpuFamily(model)).toBe('apple-other');
    });
  }

  for (const model of [undefined, '', 'unknown', 'AMD Ryzen 9 7950X', 'ARM Cortex-A72', 'NotApple M1']) {
    it(`buckets ${String(model)} as other`, () => {
      expect(cpuFamily(model)).toBe('other');
    });
  }
});

describe('Rosetta flag', () => {
  for (const translated of [true, false]) {
    it(`maps Electron's stubbed translation flag ${translated} on macOS`, () => {
      expect(underRosetta({ runningUnderARM64Translation: translated }, 'darwin')).toBe(translated);
    });
  }

  for (const platform of ['win32', 'linux'] as const) {
    it(`reports false on ${platform} without reading the macOS getter`, () => {
      expect(underRosetta({
        get runningUnderARM64Translation(): boolean {
          throw new Error('macOS-only getter');
        },
      }, platform)).toBe(false);
    });
  }

  it('reports false when the translation flag is absent', () => {
    expect(underRosetta({}, 'darwin')).toBe(false);
  });
});
