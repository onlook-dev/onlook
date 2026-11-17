import { describe, expect, it } from 'bun:test';
import { applyArtifactEdits } from './text-edits.js';

describe('targeted artifact text edits', () => {
  it('updates JavaScript without expanding replacement dollar patterns', () => {
    const bundle = { pages: [{ path: 'pages/index.html', name: 'Home' }], files: [
      { path: 'pages/main.js', bytes: Buffer.from('const title = "First";\r\n') },
    ] };
    const result = applyArtifactEdits(bundle, [{ path: 'pages/main.js', oldText: 'First', newText: '$& $$ $`' }]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(Buffer.from(result.bundle.files[0]!.bytes).toString()).toBe('const title = "$& $$ $`";\r\n');
    expect(Buffer.from(bundle.files[0]!.bytes).toString()).toBe('const title = "First";\r\n');
  });

  it('refuses invalid UTF-8 instead of corrupting unchanged bytes', () => {
    const bundle = { pages: [{ path: 'pages/index.html', name: 'Home' }], files: [
      { path: 'pages/main.css', bytes: Buffer.from([0xff, 0x61]) },
    ] };
    expect(applyArtifactEdits(bundle, [{ path: 'pages/main.css', oldText: 'a', newText: 'b' }])).toEqual({ ok: false, reason: 'The edit target is not valid UTF-8 text.' });
    expect(bundle.files[0]?.bytes).toEqual(Buffer.from([0xff, 0x61]));
  });
});
