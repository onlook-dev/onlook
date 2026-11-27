import { describe, expect, it } from 'bun:test';
import { findModelChoice, modelDisplayName, modelLabel, offeredModels } from './models.js';

describe('modelLabel', () => {
  it('handles repeated opening brackets in a model suffix quickly', () => {
    expect(modelLabel('gpt-6.1-sol[[1m]')).toBe('gpt-6.1-sol[[1m]');
    const started = performance.now();
    for (const model of [`unknown${'['.repeat(100_000)}`, `unknown${'['.repeat(1_000_000)}1m]`]) {
      expect(modelLabel(model)).toBe(model);
    }
    expect(performance.now() - started).toBeLessThan(1000);
  });
  it('labels a bare alias, which is what a session runs under before init', () => {
    expect(modelLabel('opus')).toBe('Opus');
    expect(modelLabel('sonnet')).toBe('Sonnet');
    expect(modelLabel('fable')).toBe('Fable');
  });

  it('labels other members of a family, not just one version', () => {
    expect(modelLabel('claude-sonnet-4-6')).toBe('Sonnet 4.6');
    expect(modelLabel('claude-opus-4-8')).toBe('Opus 4.8');
    expect(modelLabel('claude-opus-5-20260514')).toBe('Opus 5');
  });

  it('is case-insensitive, since an id can arrive from a config or a flag', () => {
    expect(modelLabel('Opus')).toBe('Opus');
    expect(modelLabel('CLAUDE-SONNET-5')).toBe('Sonnet 5');
  });

  it('ignores a bracketed context suffix, which is not a version', () => {
    expect(modelLabel('claude-opus-5[1m]')).toBe('Opus 5');
    expect(modelLabel('opus[1m]')).toBe('Opus');
  });

  it('labels the GPT family the way users read it: spaces, version, named variant', () => {
    expect(modelLabel('gpt-6.1-sol')).toBe('GPT 6.1 Sol');
    expect(modelLabel('gpt-5.6-sol')).toBe('GPT 5.6 Sol');
    expect(modelLabel('gpt-6-astra')).toBe('GPT 6 Astra');
    expect(modelLabel('gpt-5.5')).toBe('GPT 5.5');
    expect(modelLabel('gpt-5.5-codex-mini')).toBe('GPT 5.5 Codex Mini');
  });

  it('returns an unknown id verbatim rather than blank or stale', () => {
    expect(modelLabel('o3-pro')).toBe('o3-pro');
    expect(modelLabel('')).toBe('');
  });
});

describe('modelDisplayName', () => {
  it('names a codex row from its id, not the hyphenated vendor label', () => {
    expect(modelDisplayName({ value: 'gpt-5.6-sol', displayName: 'GPT-5.6-Sol' })).toBe('GPT 5.6 Sol');
  });

  it('names a Claude row with its resolved version and nothing else — no context parenthetical', () => {
    expect(modelDisplayName({ value: 'opus[1m]', resolvedModel: 'claude-opus-5[1m]', displayName: 'Opus (1M context)' })).toBe(
      'Opus 5',
    );
    expect(modelDisplayName({ value: 'claude-fable-5-1', resolvedModel: 'claude-fable-5-1', displayName: 'Fable' })).toBe('Fable 5.1');
    expect(modelDisplayName({ value: 'sonnet', resolvedModel: 'claude-sonnet-5', displayName: 'Sonnet' })).toBe('Sonnet 5');
  });

  it('falls back to something readable for an unknown id, never blank', () => {
    expect(modelDisplayName({ value: 'haiku', resolvedModel: 'claude-haiku-4-5-20251001', displayName: 'Haiku' })).toBe('Haiku');
    expect(modelDisplayName({ value: 'o3-pro', displayName: '' })).toBe('o3-pro');
  });
});

describe('offeredModels', () => {
  const row = (value: string) => ({ value, displayName: value });

  it('drops the SDK default row — it is a choice, not a model', () => {
    expect(offeredModels([row('default'), row('sonnet')]).map((r) => r.value)).toEqual(['sonnet']);
  });

  it('offers only the [1m] variant when a family lists both, and the plain row when it is alone', () => {
    expect(
      offeredModels([row('opus'), row('opus[1m]'), row('sonnet'), row('fable[1m]'), row('fable')]).map((r) => r.value),
    ).toEqual(['opus[1m]', 'sonnet', 'fable[1m]']);
  });
});

describe('findModelChoice', () => {
  const OPUS_1M = { value: 'opus[1m]', resolvedModel: 'claude-opus-5[1m]', displayName: 'Opus (1M context)' };
  const SONNET = { value: 'sonnet', resolvedModel: 'claude-sonnet-5', displayName: 'Sonnet' };

  it('matches the plain alias or the reported id to the [1m] row when only that variant is offered', () => {
    expect(findModelChoice([SONNET, OPUS_1M], 'opus')).toBe(OPUS_1M);
    expect(findModelChoice([SONNET, OPUS_1M], 'claude-opus-5')).toBe(OPUS_1M);
    expect(findModelChoice([SONNET, OPUS_1M], 'opus[1m]')).toBe(OPUS_1M);
    expect(findModelChoice([SONNET, OPUS_1M], 'sonnet')).toBe(SONNET);
    expect(findModelChoice([SONNET, OPUS_1M], 'haiku')).toBeUndefined();
  });
});
