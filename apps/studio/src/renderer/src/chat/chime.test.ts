import { afterEach, describe, expect, it } from 'bun:test';
import { playChime } from './chime.js';

const originalAudio = globalThis.Audio;
const played: string[] = [];
afterEach(() => { globalThis.Audio = originalAudio; played.length = 0; });

describe('completion sound playback', () => {
  it('uses the selected asset and never creates audio while muted', () => {
    globalThis.Audio = class {
      constructor(private readonly url: string) {}
      play(): Promise<void> { played.push(this.url); return Promise.resolve(); }
    } as unknown as typeof Audio;
    playChime({ enabled: false, sound: 'two-tone' });
    expect(played).toEqual([]);
    playChime({ enabled: true, sound: 'two-tone' });
    playChime({ enabled: true, sound: 'chirp' });
    expect(played.map((url) => new URL(url).pathname.split('/').at(-1))).toEqual(['two-tone.wav', 'chirp.wav']);
  });
});
