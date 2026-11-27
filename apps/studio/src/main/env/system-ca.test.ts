import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import { type CertificateStore, trustSystemCertificates } from './system-ca.js';

const inheritedRoot = process.env['STUDIO_STATE_ROOT'];
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'studio-system-ca-'));
  resetLogForTesting();
  process.env['STUDIO_STATE_ROOT'] = root;
  recordLinesForTesting();
});

afterEach(() => {
  resetLogForTesting();
  if (inheritedRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = inheritedRoot;
  rmSync(root, { recursive: true, force: true });
});

function store(certificates: Record<'default' | 'system', string[]>): CertificateStore & { trusted: unknown[][] } {
  const trusted: unknown[][] = [];
  return {
    trusted,
    getCACertificates: (type) => certificates[type === 'system' ? 'system' : 'default'],
    setDefaultCACertificates: (next) => { trusted.push([...next]); },
  };
}

function warnings(): Record<string, unknown>[] {
  return peekLinesForTesting().filter((line) => line.level === 'warn' && line.subsystem === 'env');
}

test('the system certificates join the bundled ones, each once', () => {
  const certificates = store({ default: ['bundled', 'shared'], system: ['shared', 'proxy'] });
  trustSystemCertificates(certificates);
  expect(certificates.trusted).toEqual([['bundled', 'shared', 'proxy']]);
  expect(warnings()).toEqual([]);
});

test('a runtime without the certificate API keeps the bundled ones and says so', () => {
  expect(() => trustSystemCertificates({})).not.toThrow();
  expect(warnings()).toContainEqual(expect.objectContaining({ msg: expect.stringContaining('system certificates') }));
});

test('an unreadable system store keeps the bundled ones and says why', () => {
  const certificates = store({ default: ['bundled'], system: [] });
  certificates.getCACertificates = (type) => {
    if (type === 'system') throw new Error('keychain locked');
    return ['bundled'];
  };
  expect(() => trustSystemCertificates(certificates)).not.toThrow();
  expect(certificates.trusted).toEqual([]);
  expect(warnings()).toContainEqual(expect.objectContaining({ error: expect.objectContaining({ message: 'keychain locked' }) }));
});

test('a refused install keeps the bundled ones and says why', () => {
  const certificates = store({ default: ['bundled'], system: ['proxy'] });
  certificates.setDefaultCACertificates = () => { throw new TypeError('bad certificate'); };
  expect(() => trustSystemCertificates(certificates)).not.toThrow();
  expect(warnings()).toContainEqual(expect.objectContaining({ error: expect.objectContaining({ message: 'bad certificate' }) }));
});

test('an empty system store changes nothing and says so', () => {
  const certificates = store({ default: ['bundled'], system: [] });
  trustSystemCertificates(certificates);
  expect(certificates.trusted).toEqual([]);
  expect(warnings()).toEqual([]);
  expect(peekLinesForTesting()).toContainEqual(expect.objectContaining({ level: 'debug', subsystem: 'env', msg: 'no system certificates found; using the bundled ones' }));
});

test('main trusts the system certificates on ready, before its first HTTPS request', () => {
  const startup = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
  const at = (code: string): number => {
    const index = startup.indexOf(code);
    expect(index, code).toBeGreaterThan(-1);
    return index;
  };
  expect(at('app.whenReady()')).toBeLessThan(at('initLog({'));
  expect(at('initLog({')).toBeLessThan(at('trustSystemCertificates();'));
  expect(at('trustSystemCertificates();')).toBeLessThan(at('primeFlags(flag);'));
  expect(at('trustSystemCertificates();')).toBeLessThan(at('prepareTelemetry();'));
});
