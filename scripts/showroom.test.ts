import { describe, expect, test } from 'bun:test';
import { childEnv, INSTRUMENTS, resolveInstrument } from './showroom.js';

describe('resolveInstrument', () => {
  test('projects can open a recovery state without scrolling the gallery', () => {
    expect(resolveInstrument('projects')).toEqual({ env: 'STUDIO_PROJECTS', value: '1' });
    expect(resolveInstrument('projects:recovery')).toEqual({ env: 'STUDIO_PROJECTS', value: 'recovery' });
    expect(resolveInstrument('projects:collapsed')).toEqual({ env: 'STUDIO_PROJECTS', value: 'collapsed' });
    expect(resolveInstrument('projects:pending')).toEqual({ env: 'STUDIO_PROJECTS', value: 'pending' });
    expect(resolveInstrument('projects:menu')).toEqual({ env: 'STUDIO_PROJECTS', value: 'menu' });
  });

  test('a flag instrument ignores any scenario', () => {
    expect(resolveInstrument('diagnostics:whatever')).toEqual({ env: 'STUDIO_DIAGNOSTICS', value: '1' });
  });

  test('a showroom gallery becomes <gallery> or <gallery>/<category>', () => {
    expect(resolveInstrument('git')).toEqual({ env: 'STUDIO_SHOWROOM', value: 'git' });
    expect(resolveInstrument('git:card')).toEqual({ env: 'STUDIO_SHOWROOM', value: 'git/card' });
    expect(resolveInstrument('chat:tool-rows')).toEqual({ env: 'STUDIO_SHOWROOM', value: 'chat/tool-rows' });
    expect(resolveInstrument('theme:skeleton')).toEqual({ env: 'STUDIO_SHOWROOM', value: 'theme/skeleton' });
    expect(resolveInstrument('discover:discover-star-focus')).toEqual({ env: 'STUDIO_SHOWROOM', value: 'discover/discover-star-focus' });
  });

  test('a scenario keeps every colon after the first', () => {
    expect(resolveInstrument('onboarding:import')).toEqual({ env: 'STUDIO_ONBOARDING', value: 'import' });
    expect(resolveInstrument('onboarding:a:b')).toEqual({ env: 'STUDIO_ONBOARDING', value: 'a:b' });
    expect(resolveInstrument('chat-fixture:multi')).toEqual({ env: 'STUDIO_CHAT_FIXTURE', value: 'multi' });
    expect(resolveInstrument('chat-fixture')).toEqual({ env: 'STUDIO_CHAT_FIXTURE', value: '1' });
  });

  test('an unknown name is undefined', () => {
    expect(resolveInstrument('nope')).toBeUndefined();
    expect(resolveInstrument('')).toBeUndefined();
  });
});

describe('childEnv', () => {
  test('clears every other instrument gate so an inherited one cannot outrank the choice', () => {
    const inherited: NodeJS.ProcessEnv = { STUDIO_CHAT_FIXTURE: 'multi', STUDIO_PROJECTS: '1', PATH: '/x' };
    const env = childEnv(inherited, { env: 'STUDIO_SHOWROOM', value: 'git' }, '/tmp/s');
    expect(env['STUDIO_CHAT_FIXTURE']).toBeUndefined();
    expect(env['STUDIO_PROJECTS']).toBeUndefined();
    expect(env['STUDIO_SHOWROOM']).toBe('git');
    expect(env['STUDIO_STATE_ROOT']).toBe('/tmp/s');
    expect(env['PATH']).toBe('/x');
    expect(Object.keys(INSTRUMENTS).length).toBeGreaterThan(0);
  });
});
