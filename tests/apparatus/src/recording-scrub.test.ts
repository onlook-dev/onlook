import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leaks, scrub, shapes, type Identity } from '../../live/recording.js';

const ELSEWHERE: Identity = { home: '/Users/avery', tmp: ['/var/folders/q1/zz9/T'], user: 'avery', host: ['avery-mbp.lan', 'avery-mbp'] };
const linked = `onlook://project/${encodeURIComponent(`${homedir().toLowerCase()}/.cache/site`)}/frame/1`;

const delta = (index: number, delta: Record<string, string>) => ({
  type: 'stream_event',
  event: { type: 'content_block_delta', index, delta },
  session_id: 's',
  parent_tool_use_id: null,
});

const lines = (rows: unknown[]): string => rows.map((row) => JSON.stringify(row)).join('\n');

test('a project link carrying the lowercased, URL-encoded home path is caught and scrubbed', () => {
  expect(leaks(JSON.stringify({ result: linked }))).toContain('an encoded machine path');
  const [line] = scrub('claude', { turn: [{ type: 'result', result: linked }] })['turn'] ?? [];
  expect(line).toContain('onlook://project/<home>');
  expect(leaks(line ?? '')).toEqual([]);
});

describe('a path or a name cut across stream deltas', () => {
  const split = [
    delta(0, { type: 'text_delta', text: 'Opened onlook://project/%2Fus' }),
    delta(0, { type: 'text_delta', text: 'ers%2Favery%2F.cache%2Fsite and ' }),
    delta(1, { type: 'input_json_delta', partial_json: '{"file_path":"/Us' }),
    delta(1, { type: 'input_json_delta', partial_json: 'ers/avery/.cache/site/index.html"}' }),
  ];

  test('is caught though no single row carries it', () => {
    const slug = [delta(0, { type: 'text_delta', text: 'workspaces/users-av' }), delta(0, { type: 'text_delta', text: 'ery-cache-site' })];
    for (const row of slug) expect(leaks(JSON.stringify(row), ELSEWHERE)).toEqual([]);
    expect(leaks(lines(slug), ELSEWHERE)).toContain('the username across stream deltas');
    expect(leaks(lines(split), ELSEWHERE)).toContain('a home path across stream deltas');
  });

  test('is scrubbed in place, each delta kept, so the joined text reads the placeholder', () => {
    const out = (scrub('claude', { turn: split }, ELSEWHERE)['turn'] ?? []).map((line) => JSON.parse(line) as ReturnType<typeof delta>);
    expect(out).toHaveLength(split.length);
    const joined = (index: number) => out.filter((row) => row.event.index === index).map((row) => Object.values(row.event.delta)[1]).join('');
    expect(joined(0)).toBe('Opened onlook://project/<home>%2F.cache%2Fsite and ');
    expect(joined(1)).toBe('{"file_path":"<home>/.cache/site/index.html"}');
    expect(leaks(out.map((row) => JSON.stringify(row)).join('\n'), ELSEWHERE)).toEqual([]);
  });
});

test('an email the agent wrote into a page stays an address, and is never the original', () => {
  const page = '<a href="mailto:hello@hearth-crumb.com">hello@hearth-crumb.com</a> <input placeholder="you@example.com" />';
  const [line] = scrub('claude', { turn: [{ type: 'assistant', content: page }] }, ELSEWHERE)['turn'] ?? [];
  const content = (JSON.parse(line ?? '{}') as { content: string }).content;
  expect(content).toBe('<a href="mailto:email-1@example.com">email-1@example.com</a> <input placeholder="you@example.com" />');
  expect(leaks(JSON.stringify({ content: page }), ELSEWHERE)).toContain('2 email address(es)');
});

test("the account's rate-limit usage keeps its shape and loses its values", () => {
  const row = {
    type: 'rate_limit_event',
    rate_limit_info: { status: 'allowed', resetsAt: 1793322000, rateLimitType: 'five_hour', overageStatus: 'rejected', isUsingOverage: true, unifiedWindows: { five_hour: { utilization: 0.06 } } },
  };
  expect(leaks(JSON.stringify(row), ELSEWHERE)).toContain("the account's rate-limit usage");
  const [line] = scrub('claude', { turn: [row] }, ELSEWHERE)['turn'] ?? [];
  expect(JSON.parse(line ?? '{}')).toEqual({
    type: 'rate_limit_event',
    rate_limit_info: { status: 'allowed', resetsAt: 0, rateLimitType: 'five_hour', overageStatus: '<account>', isUsingOverage: false, unifiedWindows: { five_hour: { utilization: 0 } } },
  });
  expect(leaks(line ?? '', ELSEWHERE)).toEqual([]);
});

const RECORDINGS = [
  fileURLToPath(new URL('../recordings/', import.meta.url)),
  fileURLToPath(new URL('../../live/recordings/claude/', import.meta.url)),
  fileURLToPath(new URL('../../live/recordings/codex/', import.meta.url)),
];

test.each(RECORDINGS.flatMap((dir) => readdirSync(dir).filter((file) => file.endsWith('.jsonl')).map((file) => join(dir, file))))(
  'the checked-in recording %s carries nothing of a machine or an account',
  (path) => {
    expect(leaks(readFileSync(path, 'utf8'))).toEqual([]);
  },
);

const parsed = (harness: 'claude' | 'codex', recordings: Record<string, unknown[]>): Record<string, any[]> =>
  Object.fromEntries(Object.entries(scrub(harness, recordings, ELSEWHERE)).map(([scenario, rows]) => [scenario, rows.map((row) => JSON.parse(row))]));

describe("a Codex account's plan, ids and rate limits", () => {
  const snapshot = (resetsAt: number) => ({
    limitId: 'codex', limitName: null,
    primary: { usedPercent: 12, windowDurationMins: 300, resetsAt },
    credits: { hasCredits: true, unlimited: false, balance: '25' },
    planType: 'pro', rateLimitReachedType: null,
  });
  const credit = (hex: string) => ({
    id: `RateLimitResetCredit_${hex}`, resetType: 'codexRateLimits', status: 'available', grantedAt: 1890000088, expiresAt: 1892592088, title: 'Full reset', description: 'One free reset.',
  });
  const [first, second] = ['0123456789abcdef0123456789abcdef', 'fedcba9876543210fedcba9876543210'] as const;
  const read = {
    id: 4,
    result: {
      rateLimits: snapshot(1900000308), rateLimitsByLimitId: { codex: snapshot(1900000308) },
      rateLimitResetCredits: { availableCount: 2, credits: [credit(first), credit(second)] },
      accountId: '7b0c1d2e-3f40-4a51-8b62-c7d8e9f0a1b2', rateLimitUpsell: null,
    },
  };
  const rows = [
    { method: 'remoteControl/status/changed', params: { status: 'disabled', installationId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', environmentId: null } },
    { method: 'account/updated', params: { authMode: 'chatgpt', planType: 'pro' } },
    { method: 'account/rateLimits/updated', params: { rateLimits: snapshot(1900000310) } },
    read,
  ];
  const neutral = { limitId: 'codex', limitName: null, primary: { usedPercent: 0, windowDurationMins: 300, resetsAt: 0 }, credits: { hasCredits: false, unlimited: false, balance: '<account>' }, planType: 'unknown', rateLimitReachedType: null };

  test.each([
    [0, 'an account or installation id'],
    [1, "the account's plan"],
    [2, "the account's rate-limit usage"],
    [3, "the account's rate-limit usage"],
    [3, 'an account or installation id'],
    [3, 'a provider message, request, reasoning or credit id'],
  ])('row %i is caught as %s', (index, what) => {
    expect(leaks(JSON.stringify(rows[index]), ELSEWHERE)).toContain(what);
  });

  test('keep their shape and enums, lose their values, and a credit keeps one name across messages', () => {
    const out = parsed('codex', { tools: rows, resume: [{ id: 9, result: { rateLimitResetCredits: { credits: [credit(second)] } } }] });
    expect(out['tools']).toEqual([
      { method: 'remoteControl/status/changed', params: { status: 'disabled', installationId: '00000000-0000-4000-8000-000000000000', environmentId: null } },
      { method: 'account/updated', params: { authMode: 'chatgpt', planType: 'unknown' } },
      { method: 'account/rateLimits/updated', params: { rateLimits: neutral } },
      {
        id: 4,
        result: {
          rateLimits: neutral, rateLimitsByLimitId: { codex: neutral },
          rateLimitResetCredits: {
            availableCount: 0,
            credits: [1, 2].map((n) => ({ id: `rate-limit-reset-credit-${String(n)}`, resetType: 'codexRateLimits', status: 'available', grantedAt: 0, expiresAt: 0, title: '<account>', description: '<account>' })),
          },
          accountId: '00000000-0000-4000-8000-000000000000', rateLimitUpsell: null,
        },
      },
    ]);
    expect(out['resume']?.[0].result.rateLimitResetCredits.credits[0].id).toBe('rate-limit-reset-credit-2');
    for (const scenario of Object.values(out)) expect(leaks(lines(scenario), ELSEWHERE)).toEqual([]);
    expect(shapes('codex', out)).toBe(shapes('codex', { tools: rows, resume: [{ id: 9, result: { rateLimitResetCredits: { credits: [credit(second)] } } }] }));
  });

  test("a reasoning item's id is caught and keeps one placeholder across messages", () => {
    const item = (method: string) => ({ method, params: { item: { type: 'reasoning', id: 'rs_0123456789abcdef0123456789abcdef0123456789abcdef01', summary: [] } } });
    expect(leaks(JSON.stringify(item('item/started')), ELSEWHERE)).toContain('a provider message, request, reasoning or credit id');
    const out = parsed('codex', { tools: [item('item/started')], resume: [item('item/completed')] });
    expect(out['tools']?.[0].params.item.id).toBe('rs_000000000001');
    expect(out['resume']?.[0].params.item.id).toBe('rs_000000000001');
    for (const scenario of Object.values(out)) expect(leaks(lines(scenario), ELSEWHERE)).toEqual([]);
  });
});

describe("a Claude session's provider ids, signatures and credential expiry", () => {
  const SESSION = 'aaaaaaaa-1111-4222-8333-444444444444';
  const OTHER = 'bbbbbbbb-5555-4666-8777-888888888888';
  const MESSAGE = 'msg_01AbCdEfGhJkLmNpQrStUvWx';
  const REQUEST = 'req_01AbCdEfGhJkLmNpQrStUvWx';
  const blob = 'c2lnbmF0dXJlLXNhbXBsZS8r'.repeat(8);
  const stream = (event: Record<string, unknown>) => ({ type: 'stream_event', event, session_id: SESSION, parent_tool_use_id: null });
  const rows = [
    stream({ type: 'message_start', message: { id: MESSAGE, content: [] } }),
    stream({ type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } }),
    stream({ type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: blob } }),
    {
      type: 'assistant', session_id: SESSION, request_id: REQUEST,
      message: { id: MESSAGE, content: [{ type: 'thinking', thinking: 'Reading.', signature: blob }, { type: 'redacted_thinking', data: blob }, { type: 'tool_use', id: 'toolu_1', input: { signature: 'fn(a, b)' } }] },
    },
    { type: 'result', session_id: SESSION, result: `Saved ${SESSION}.jsonl after ${MESSAGE}`, credential_expires_at: '2031-02-03T04:05:06.789Z' },
    { type: 'assistant', session_id: OTHER, request_id: 'req_01ZyXwVuTsRqPnMkJhGfEdCb', message: { id: 'msg_01ZyXwVuTsRqPnMkJhGfEdCb', content: [] } },
  ];

  test.each([
    [0, 'a session id'],
    [0, 'a provider message, request, reasoning or credit id'],
    [2, 'a thinking signature'],
    [3, 'a thinking signature'],
    [3, 'a provider message, request, reasoning or credit id'],
    [4, "the account's credential expiry"],
  ])('row %i is caught as %s', (index, what) => {
    expect(leaks(JSON.stringify(rows[index]), ELSEWHERE)).toContain(what);
  });

  test('each id keeps one placeholder of its own shape wherever it appears, and the rest is fixed', () => {
    const out = parsed('claude', { tools: rows, resume: [rows[3]] });
    const [start, opened, signed, assistant, result, other] = out['tools'] ?? [];
    const session = '00000000-0000-4000-8000-000000000001';
    expect(out['tools']?.map((row) => row.session_id)).toEqual([session, session, session, session, session, '00000000-0000-4000-8000-000000000002']);
    expect(start.event.message.id).toBe('msg_000000000001');
    expect(opened.event.content_block.signature).toBe('');
    expect(signed.event.delta.signature).toBe('<signature>');
    expect(assistant).toMatchObject({ request_id: 'req_000000000002', message: { id: 'msg_000000000001' } });
    expect(assistant.message.content).toEqual([
      { type: 'thinking', thinking: 'Reading.', signature: '<signature>' },
      { type: 'redacted_thinking', data: '<signature>' },
      { type: 'tool_use', id: 'toolu_1', input: { signature: 'fn(a, b)' } },
    ]);
    expect(result.result).toBe(`Saved ${session}.jsonl after msg_000000000001`);
    expect(result.credential_expires_at).toBe('1970-01-01T00:00:00.000Z');
    expect(other).toMatchObject({ request_id: 'req_000000000003', message: { id: 'msg_000000000004' } });
    expect(out['resume']?.[0]).toEqual(assistant);
    for (const scenario of Object.values(out)) expect(leaks(lines(scenario), ELSEWHERE)).toEqual([]);
    expect(shapes('claude', out)).toBe(shapes('claude', { tools: rows, resume: [rows[3]] }));
  });
});
