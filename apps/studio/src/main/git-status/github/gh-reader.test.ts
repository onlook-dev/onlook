import { describe, expect, it } from 'bun:test';
import type { GhResult, GhRunner } from '../gh.js';
import { ghReader, reduceChecks, signedInAccount, signedInAccountText } from './gh-reader.js';
import { FAIL, forkView, MISSING, ok, PARENT, rawPr, scriptedGh, TIMEOUT } from './test-support.js';

const CWD = '/tmp/any';

const AUTHED = JSON.stringify({
  hosts: { 'github.com': [{ state: 'success', login: 'wrenquill', active: true }] },
});

function scripted(answer: GhResult): { reader: ReturnType<typeof ghReader>; calls: string[][]; cwds: string[] } {
  const calls: string[][] = [];
  const cwds: string[] = [];
  const runner: GhRunner = async (cwd, args) => {
    cwds.push(cwd);
    calls.push(args);
    return answer;
  };
  return { reader: ghReader(CWD, runner), calls, cwds };
}

describe('ghReader.present', () => {
  it('runs gh --version', async () => {
    const { reader, calls, cwds } = scripted(ok('gh version 2.0.0'));
    expect(await reader.present()).toEqual({ ok: true, value: true });
    expect(calls).toEqual([['--version']]);
    expect(cwds).toEqual([CWD]);
  });
  it('a missing binary is the explicit negative', async () => {
    expect(await scripted(MISSING).reader.present()).toEqual({ ok: false, partial: false });
  });
  it('a present binary that fails is partial', async () => {
    expect(await scripted(FAIL).reader.present()).toEqual({ ok: false, partial: true });
    expect(await scripted(TIMEOUT).reader.present()).toEqual({ ok: false, partial: true });
  });
});

const NO_JSON: GhResult = { ...FAIL, err: 'unknown flag: --json\n\nUsage:  gh auth status [flags]' };
const TEXT_STATUS = [
  'github.com',
  '  ✓ Logged in to github.com account wrenquill (keyring)',
  '  - Active account: true',
  '  - Git operations protocol: https',
  '  - Token: gho_************************************',
  "  - Token scopes: 'gist', 'read:org', 'repo'",
].join('\n');

function oldGh(text: GhResult): { reader: ReturnType<typeof ghReader>; calls: string[][] } {
  const calls: string[][] = [];
  const runner: GhRunner = async (_cwd, args) => {
    calls.push(args);
    return args.includes('--json') ? NO_JSON : text;
  };
  return { reader: ghReader(CWD, runner), calls };
}

describe('ghReader.identity', () => {
  it('runs gh auth status --json hosts and reads the login', async () => {
    const { reader, calls } = scripted(ok(AUTHED));
    expect(await reader.identity()).toEqual({ ok: true, value: { account: 'wrenquill' } });
    expect(calls).toEqual([['auth', 'status', '--json', 'hosts']]);
  });
  it('an empty host list is not signed in', async () => {
    expect(await scripted(ok(JSON.stringify({ hosts: {} }))).reader.identity()).toEqual({ ok: false, partial: false });
  });
  it('an explicit "not logged in" is the explicit negative', async () => {
    const notLoggedIn: GhResult = { ...FAIL, err: 'You are not logged into any GitHub hosts. To log in, run: gh auth login' };
    expect(await scripted(notLoggedIn).reader.identity()).toEqual({ ok: false, partial: false });
  });
  it('a host in state error is partial (offline), unless the error names the credential', async () => {
    const offline = ok(JSON.stringify({ hosts: { 'github.com': [{ state: 'error', error: 'Get "https://api.github.com/": dial tcp: connection refused', active: true, login: 'wrenquill' }] } }));
    expect(await scripted(offline).reader.identity()).toEqual({ ok: false, partial: true });
    const badToken = ok(JSON.stringify({ hosts: { 'github.com': [{ state: 'error', error: 'The token in GH_TOKEN is invalid.', active: true }] } }));
    expect(await scripted(badToken).reader.identity()).toEqual({ ok: false, partial: false });
  });
  it('any other failure or a timeout is partial', async () => {
    expect(await scripted(FAIL).reader.identity()).toEqual({ ok: false, partial: true });
    expect(await scripted(TIMEOUT).reader.identity()).toEqual({ ok: false, partial: true });
  });
  it('gh before 2.81.0 has no --json on auth status: the text form answers instead (ONL-2316)', async () => {
    const { reader, calls } = oldGh(ok(TEXT_STATUS));
    expect(await reader.identity()).toEqual({ ok: true, value: { account: 'wrenquill' } });
    expect(calls).toEqual([
      ['auth', 'status', '--json', 'hosts'],
      ['auth', 'status', '--hostname', 'github.com'],
    ]);
  });
  it('the text form: signed out is the explicit negative; any other failure or a timeout is partial', async () => {
    const signedOut: GhResult = { ...FAIL, err: 'You are not logged into any GitHub hosts. To log in, run: gh auth login' };
    expect(await oldGh(signedOut).reader.identity()).toEqual({ ok: false, partial: false });
    expect(await oldGh(FAIL).reader.identity()).toEqual({ ok: false, partial: true });
    expect(await oldGh(TIMEOUT).reader.identity()).toEqual({ ok: false, partial: true });
  });
  it('the text form lands on stderr once any account fails: a healthy account still signs in, a revoked token alone is the explicit negative', async () => {
    const mixed: GhResult = { ...FAIL, err: [
      'github.com',
      '  X Failed to log in to github.com account stale (keyring)',
      '  - Active account: false',
      '  - The token in keyring is invalid.',
      '  ✓ Logged in to github.com account wrenquill (keyring)',
      '  - Active account: true',
    ].join('\n') };
    expect(await oldGh(mixed).reader.identity()).toEqual({ ok: true, value: { account: 'wrenquill' } });
    const revoked: GhResult = { ...FAIL, err: [
      'github.com',
      '  X Failed to log in to github.com account wrenquill (keyring)',
      '  - Active account: true',
      '  - The token in keyring is invalid.',
      '  - To re-authenticate, run: gh auth login -h github.com',
    ].join('\n') };
    expect(await oldGh(revoked).reader.identity()).toEqual({ ok: false, partial: false });
  });
  it('signedInAccountText picks the active account among several, else the first; a failed login is nobody', () => {
    const two = [
      '  ✓ Logged in to github.com account first (keyring)',
      '  - Active account: false',
      '  ✓ Logged in to github.com account second (keyring)',
      '  - Active account: true',
    ].join('\n');
    expect(signedInAccountText(two)).toBe('second');
    expect(signedInAccountText('  ✓ Logged in to github.com account only (keyring)')).toBe('only');
    expect(signedInAccountText('X Failed to log in to github.com account wrenquill (keyring)\n  - Active account: true')).toBeUndefined();
    const failedAfter = [
      '  ✓ Logged in to github.com account first (keyring)',
      '  - Active account: false',
      '  X Failed to log in to github.com account stale (keyring)',
      '  - Active account: true',
      '  ✓ Logged in to github.com account second (keyring)',
      '  - Active account: false',
    ].join('\n');
    expect(signedInAccountText(failedAfter)).toBe('first');
  });
  it('signedInAccountText reads the pre-2.40 wording, "as NAME"', () => {
    expect(signedInAccountText('  ✓ Logged in to github.com as wrenquill (keyring)')).toBe('wrenquill');
  });
  it('signedInAccount reads only a success host', () => {
    expect(signedInAccount(AUTHED)).toBe('wrenquill');
    expect(signedInAccount(JSON.stringify({ hosts: { 'github.com': [{ state: 'success' }] } }))).toBe('');
    expect(signedInAccount(JSON.stringify({ hosts: { 'github.com': [{ state: 'timeout', login: 'x' }] } }))).toBeUndefined();
    expect(signedInAccount('not json')).toBeUndefined();
  });
});

describe('ghReader.access', () => {
  const view = (viewerPermission?: string) => ok(JSON.stringify(viewerPermission ? { viewerPermission } : {}));
  const FIELDS = 'viewerPermission,nameWithOwner,isFork,parent';

  it('runs gh repo view owner/name when the repo is known', async () => {
    const { reader, calls } = scripted(view('WRITE'));
    expect(await reader.access('onlook-dev/fixture')).toEqual({ ok: true, value: { permission: 'granted' } });
    expect(calls).toEqual([['repo', 'view', 'onlook-dev/fixture', '--json', FIELDS]]);
  });
  it('omits the repo when it is unknown', async () => {
    const { reader, calls } = scripted(view('ADMIN'));
    await reader.access();
    expect(calls).toEqual([['repo', 'view', '--json', FIELDS]]);
  });
  it('WRITE, MAINTAIN and ADMIN are granted', async () => {
    for (const p of ['WRITE', 'MAINTAIN', 'ADMIN']) {
      expect(await scripted(view(p)).reader.access()).toEqual({ ok: true, value: { permission: 'granted' } });
    }
  });
  it('READ, TRIAGE and an absent permission are denied', async () => {
    for (const p of ['READ', 'TRIAGE', undefined]) {
      expect(await scripted(view(p)).reader.access()).toEqual({ ok: true, value: { permission: 'denied', reason: p === 'READ' || p === 'TRIAGE' ? 'read-only' : 'unknown' } });
    }
  });
  it('an explicit not-found is denied', async () => {
    const stderrs = [
      "GraphQL: Could not resolve to a Repository with the name 'onlook-dev/fixture'. (repository)",
      'HTTP 404: Not Found',
    ];
    for (const err of stderrs) {
      expect(await scripted({ ...FAIL, err }).reader.access()).toEqual({ ok: true, value: { permission: 'denied', reason: 'repo-not-visible' } });
    }
  });
  it('any other failure, a 403, or a timeout is partial', async () => {
    expect(await scripted(FAIL).reader.access()).toEqual({ ok: false, partial: true });
    expect(await scripted({ ...FAIL, err: 'HTTP 403: API rate limit exceeded' }).reader.access()).toEqual({ ok: false, partial: true });
    expect(await scripted({ ...FAIL, err: 'HTTP 403: Forbidden' }).reader.access()).toEqual({ ok: false, partial: true });
    expect(await scripted({ ...TIMEOUT, err: 'HTTP 404' }).reader.access()).toEqual({ ok: false, partial: true });
  });
});

describe('ghReader.access on a fork', () => {
  it('composes the parent slug from parent.owner.login and parent.name and reads the parent permission', async () => {
    const { reader, calls } = scriptedGh({ repo: forkView('ADMIN', PARENT), views: { 'up/stream': ok(JSON.stringify({ viewerPermission: 'WRITE' })) } });
    expect(await reader.access('me/stream')).toEqual({ ok: true, value: { permission: 'granted', parent: 'up/stream', parentPermission: 'granted', owner: 'onlook-dev' } });
    expect(calls).toEqual([
      ['repo', 'view', 'me/stream', '--json', 'viewerPermission,nameWithOwner,isFork,parent'],
      ['repo', 'view', 'up/stream', '--json', 'viewerPermission'],
    ]);
  });
  it('a parent below WRITE is denied on the parent while the origin stays granted', async () => {
    for (const p of ['READ', 'TRIAGE', undefined]) {
      const { reader } = scriptedGh({ repo: forkView('WRITE', PARENT), views: { 'up/stream': ok(JSON.stringify(p ? { viewerPermission: p } : {})) } });
      expect(await reader.access('me/stream')).toEqual({ ok: true, value: { permission: 'granted', parent: 'up/stream', parentPermission: 'denied', owner: 'onlook-dev' } });
    }
  });
  it('the owner is what GitHub spells, absent when the view does not name the repo', async () => {
    const { reader } = scriptedGh({
      repo: ok(JSON.stringify({ viewerPermission: 'WRITE', nameWithOwner: 'Onlook-Dev/fixture', isFork: true, parent: PARENT })),
      views: { 'up/stream': ok(JSON.stringify({ viewerPermission: 'WRITE' })) },
    });
    const answer = await reader.access('onlook-dev/fixture');
    expect(answer.ok && answer.value.owner).toBe('Onlook-Dev');
    const nameless = scriptedGh({ repo: ok(JSON.stringify({ viewerPermission: 'WRITE', isFork: true, parent: PARENT })), views: { 'up/stream': ok(JSON.stringify({ viewerPermission: 'WRITE' })) } });
    const unnamed = await nameless.reader.access('onlook-dev/fixture');
    expect(unnamed.ok && 'owner' in unnamed.value).toBe(false);
  });
  it('parent null is a non-fork: no parent, one call', async () => {
    const { reader, calls } = scriptedGh({ repo: forkView('WRITE', null) });
    expect(await reader.access('me/stream')).toEqual({ ok: true, value: { permission: 'granted' } });
    expect(calls.length).toBe(1);
  });
  it('a parent missing its name or owner is a non-fork', async () => {
    for (const parent of [{ name: 'stream' }, { owner: { login: 'up' } }, {}]) {
      const { reader, calls } = scriptedGh({ repo: forkView('WRITE', parent) });
      expect(await reader.access('me/stream')).toEqual({ ok: true, value: { permission: 'granted' } });
      expect(calls.length).toBe(1);
    }
  });
  it('a fork denied at the origin never views the parent', async () => {
    const { reader, calls } = scriptedGh({ repo: forkView('READ', PARENT) });
    expect(await reader.access('me/stream')).toEqual({ ok: true, value: { permission: 'denied', reason: 'read-only' } });
    expect(calls.length).toBe(1);
  });
  it('a parent that fails, 404s, or times out is partial', async () => {
    for (const answer of [FAIL, { ...FAIL, err: 'HTTP 404: Not Found' }, TIMEOUT]) {
      const { reader } = scriptedGh({ repo: forkView('WRITE', PARENT), views: { 'up/stream': answer } });
      expect(await reader.access('me/stream')).toEqual({ ok: false, partial: true });
    }
  });
});

describe('ghReader.pullRequests', () => {
  it('runs gh pr list with -R and --head and normalises the rows', async () => {
    const prs = [rawPr({ number: 7, statusCheckRollup: [{ __typename: 'CheckRun', status: 'IN_PROGRESS', conclusion: null }] })];
    const { reader, calls } = scripted(ok(JSON.stringify(prs)));
    expect(await reader.pullRequests('onlook-dev/fixture', 'feat/x')).toEqual({
      ok: true,
      value: [
        {
          number: 7,
          url: 'https://github.com/onlook-dev/fixture/pull/1',
          state: 'OPEN',
          isDraft: false,
          mergeStateStatus: 'CLEAN',
          checks: 'pending',
          baseRefName: 'main',
          updatedAt: '2026-08-01T00:00:00Z',
        },
      ],
    });
    expect(calls).toEqual([
      [
        'pr',
        'list',
        '-R',
        'onlook-dev/fixture',
        '--head',
        'feat/x',
        '--state',
        'all',
        '--limit',
        '200',
        '--json',
        'number,url,state,isDraft,mergeStateStatus,statusCheckRollup,baseRefName,updatedAt,headRepositoryOwner',
      ],
    ]);
  });
  it('the head-owner filter compares logins case-insensitively', async () => {
    const prs = [rawPr({ number: 1, headRepositoryOwner: { login: 'me' } }), rawPr({ number: 2, headRepositoryOwner: { login: 'other' } })];
    const answer = await scripted(ok(JSON.stringify(prs))).reader.pullRequests('up/stream', 'feature', { headOwner: 'Me' });
    expect(answer.ok && answer.value.map((pr) => pr.number)).toEqual([1]);
  });
  it('narrows by --author at 50 rows when the head owner is the signed-in account (case-insensitively); otherwise a 200-row page, no author', async () => {
    const argv = async (filter: Parameters<ReturnType<typeof ghReader>['pullRequests']>[2]): Promise<string[]> => {
      const { reader, calls } = scripted(ok('[]'));
      await reader.pullRequests('up/stream', 'main', filter);
      return calls[0]!;
    };
    const own = await argv({ headOwner: 'Me', account: 'me' });
    expect(own.slice(own.indexOf('--author'), own.indexOf('--author') + 4)).toEqual(['--author', 'me', '--limit', '50']);
    for (const filter of [{ headOwner: 'org', account: 'me' }, { headOwner: 'org' }, { account: 'me' }, undefined]) {
      const args = await argv(filter);
      expect(args).not.toContain('--author');
      expect(args.slice(args.indexOf('--limit'), args.indexOf('--limit') + 2)).toEqual(['--limit', '200']);
    }
  });
  it("an org fork's row survives fifty foreign rows on the same branch name", async () => {
    const prs = Array.from({ length: 50 }, (_, i) => rawPr({ number: i + 1, headRepositoryOwner: { login: `fork-${i}` } }));
    prs.push(rawPr({ number: 51, headRepositoryOwner: { login: 'org' } }));
    const { reader, calls } = scripted(ok(JSON.stringify(prs)));
    const answer = await reader.pullRequests('up/stream', 'main', { headOwner: 'org', account: 'me' });
    expect(answer.ok && answer.value.map((pr) => pr.number)).toEqual([51]);
    expect(calls[0]).toContain('200');
  });
  it('a head-owner filter keeps only that owner\'s rows; a row with no head repository is dropped', async () => {
    const prs = [
      rawPr({ number: 1, headRepositoryOwner: { login: 'me' } }),
      rawPr({ number: 2, headRepositoryOwner: { login: 'other' } }),
      rawPr({ number: 3, headRepositoryOwner: null }),
      rawPr({ number: 4 }),
    ];
    const { reader, calls } = scripted(ok(JSON.stringify(prs)));
    const answer = await reader.pullRequests('up/stream', 'feature', { headOwner: 'me' });
    expect(answer.ok && answer.value.map((pr) => pr.number)).toEqual([1]);
    expect(calls[0]?.slice(0, 6)).toEqual(['pr', 'list', '-R', 'up/stream', '--head', 'feature']);
  });
  it('without a filter every row is kept, whatever its head owner', async () => {
    const prs = [rawPr({ number: 1, headRepositoryOwner: { login: 'me' } }), rawPr({ number: 2, headRepositoryOwner: { login: 'other' } })];
    const answer = await scripted(ok(JSON.stringify(prs))).reader.pullRequests('up/stream', 'feature');
    expect(answer.ok && answer.value.map((pr) => pr.number)).toEqual([1, 2]);
  });
  it('the head owner never reaches the measured row', async () => {
    const answer = await scripted(ok(JSON.stringify([rawPr({ headRepositoryOwner: { login: 'me' } })]))).reader.pullRequests('up/stream', 'f', { headOwner: 'me' });
    expect(answer.ok && 'headRepositoryOwner' in answer.value[0]!).toBe(false);
  });
  it('omits -R when the repo is unknown', async () => {
    const { reader, calls } = scripted(ok('[]'));
    expect(await reader.pullRequests(undefined, 'feat/x')).toEqual({ ok: true, value: [] });
    expect(calls[0]?.slice(0, 4)).toEqual(['pr', 'list', '--head', 'feat/x']);
  });
  it('unparseable output is an empty list', async () => {
    expect(await scripted(ok('not json')).reader.pullRequests(undefined, 'x')).toEqual({ ok: true, value: [] });
  });
  it('scalar or object JSON is an empty list, not a throw', async () => {
    for (const out of ['"a"', '{}', '42', 'null']) {
      expect(await scripted(ok(out)).reader.pullRequests(undefined, 'x')).toEqual({ ok: true, value: [] });
    }
  });
  it('any failure is partial', async () => {
    expect(await scripted(FAIL).reader.pullRequests(undefined, 'x')).toEqual({ ok: false, partial: true });
    expect(await scripted(TIMEOUT).reader.pullRequests(undefined, 'x')).toEqual({ ok: false, partial: true });
  });
});

describe('reduceChecks', () => {
  const run = (status: string, conclusion: string | null) => ({ __typename: 'CheckRun' as const, status, conclusion });
  const ctx = (state: string) => ({ __typename: 'StatusContext' as const, state });

  it('empty is none', () => {
    expect(reduceChecks([])).toBe('none');
    expect(reduceChecks(null)).toBe('none');
  });
  it('any failing conclusion wins over pending', () => {
    expect(reduceChecks([run('IN_PROGRESS', null), run('COMPLETED', 'FAILURE')])).toBe('failing');
    expect(reduceChecks([run('COMPLETED', 'TIMED_OUT')])).toBe('failing');
    expect(reduceChecks([run('COMPLETED', 'CANCELLED')])).toBe('failing');
    expect(reduceChecks([run('COMPLETED', 'ACTION_REQUIRED')])).toBe('failing');
    expect(reduceChecks([run('COMPLETED', 'STARTUP_FAILURE')])).toBe('failing');
    expect(reduceChecks([ctx('SUCCESS'), ctx('ERROR')])).toBe('failing');
    expect(reduceChecks([ctx('FAILURE')])).toBe('failing');
  });
  it('incomplete runs or pending contexts are pending', () => {
    expect(reduceChecks([run('QUEUED', null), run('COMPLETED', 'SUCCESS')])).toBe('pending');
    expect(reduceChecks([ctx('PENDING')])).toBe('pending');
    expect(reduceChecks([ctx('EXPECTED')])).toBe('pending');
  });
  it('all complete and non-failing is passing', () => {
    expect(reduceChecks([run('COMPLETED', 'SUCCESS'), run('COMPLETED', 'SKIPPED'), run('COMPLETED', 'NEUTRAL'), ctx('SUCCESS')])).toBe('passing');
  });
});
