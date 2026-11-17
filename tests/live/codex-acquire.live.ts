// Against the real npm registry; the 111MB download runs only under CODEX_ACQUIRE_FULL=1 (ONL-2081).

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { acquireCodex } from '../../apps/studio/src/main/codex/acquire.js';
import { CODEX_VERSION, codexPlatformTag } from '../../apps/studio/src/main/codex/paths.js';

const REGISTRY = 'https://registry.npmjs.org';
const TAG = codexPlatformTag() ?? 'darwin-arm64';
const TARBALL = `${REGISTRY}/@openai/codex/-/codex-${CODEX_VERSION}-${TAG}.tgz`;

const made: string[] = [];
after(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('the published codex platform package', () => {
  it('publishes the pinned version with a sha512 integrity', async () => {
    const response = await fetch(`${REGISTRY}/@openai/codex/${CODEX_VERSION}-${TAG}`);
    assert.equal(response.status, 200, `the registry did not serve ${CODEX_VERSION}-${TAG}`);
    const document = (await response.json()) as {
      version?: string;
      dist?: { tarball?: string; integrity?: string };
    };
    assert.equal(document.version, `${CODEX_VERSION}-${TAG}`);
    assert.ok(
      document.dist?.integrity?.startsWith('sha512-'),
      `dist.integrity was ${String(document.dist?.integrity)}`,
    );
    assert.ok(document.dist?.tarball?.startsWith('https://'), 'dist.tarball was not an https URL');
  });

  it('carries a content-length on the GET the download actually reads', async () => {
    // Ranged: a plain GET pulls 111MB.
    const ranged = await fetch(TARBALL, { headers: { range: 'bytes=0-1023' } });
    assert.equal(ranged.status, 206, 'the registry refused a ranged GET');
    const contentRange = ranged.headers.get('content-range');
    assert.ok(contentRange, 'a 206 arrived with no content-range');
    const total = Number(/\/(\d+)$/.exec(contentRange)?.[1]);
    assert.ok(total > 0, `could not read a total out of "${contentRange}"`);
    await ranged.arrayBuffer();

    // HEAD returns no content-length while GET does; a size-first pre-flight would conclude no progress signal exists.
    const streamed = await fetch(TARBALL);
    const declared = streamed.headers.get('content-length');
    await streamed.body?.cancel();
    assert.equal(
      Number(declared),
      total,
      `the streaming GET declared ${String(declared)} against a real size of ${String(total)}`,
    );
  });

  it('acquires into a scratch cache root and yields a driveable install', async (t) => {
    if (process.env['CODEX_ACQUIRE_FULL'] !== '1') {
      return t.skip(
        'CODEX_ACQUIRE_FULL=1 not set — the real 111MB download did NOT run. Nothing about ' +
          'the published tarball’s CONTENTS was verified by this run.',
      );
    }
    const cacheRoot = mkdtempSync(join(tmpdir(), 'studio-live-codex-cache-'));
    made.push(cacheRoot);

    let lastPercent = -1;
    const result = await acquireCodex({
      cacheRoot,
      onProgress: ({ receivedBytes, totalBytes }) => {
        if (totalBytes === undefined) return;
        const percent = Math.floor((receivedBytes / totalBytes) * 100);
        if (percent !== lastPercent) lastPercent = percent;
      },
    });

    assert.equal(result.outcome, 'ok', `acquire said: ${JSON.stringify(result)}`);
    assert.equal(lastPercent, 100, 'progress never reached 100% against a real content-length');

    const again = await acquireCodex({ cacheRoot });
    assert.equal(again.outcome, 'ok');
    assert.equal(again.outcome === 'ok' && again.downloaded, false);
  });
});
