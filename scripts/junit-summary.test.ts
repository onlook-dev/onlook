import { describe, expect, it } from 'bun:test';
import { markdown, summarize } from './junit-summary.js';

const REPORT = `<?xml version="1.0"?><testsuites><testsuite name="a.test.ts" file="a.test.ts">
<testcase name="holds" file="a.test.ts" time="0.001" />
<testcase name="breaks | badly" file="a.test.ts" time="0.002"><failure message="expected 1 &lt; 2" type="AssertionError" /></testcase>
<testcase name="later" file="a.test.ts"><skipped /></testcase>
</testsuite></testsuites>`;

describe('the JUnit test summary', () => {
  it('keeps a pipe in a file name inside its cell, and the path readable', () => {
    const result = { passed: 0, failed: 1, skipped: 0, failures: [{ file: 'suites\\a|b.test.ts', name: 'holds', message: 'nope' }] };
    expect(markdown(result)).toContain('| `suites\\a\\|b.test.ts` | holds | nope |');
  });
  it('escapes backslashes next to pipes in both names and messages', () => {
    const value = 'name\\|value\\';
    const result = { passed: 0, failed: 1, skipped: 0, failures: [{ file: 'test.ts', name: value, message: value }] };
    expect(markdown(result)).toContain('| `test.ts` | name\\\\\\|value\\\\ | name\\\\\\|value\\\\ |');
    const started = performance.now();
    result.failures[0]!.name = '\\|'.repeat(100_000);
    result.failures[0]!.message = '\\|'.repeat(100_000);
    expect(markdown(result)).toContain('\\\\\\|'.repeat(100_000));
    expect(performance.now() - started).toBeLessThan(1000);
  });
  it('counts passed, failed and skipped tests and names each failure', () => {
    const result = summarize(REPORT);
    expect(result).toMatchObject({ passed: 1, failed: 1, skipped: 1 });
    expect(result.failures).toEqual([{ file: 'a.test.ts', name: 'breaks | badly', message: 'expected 1 < 2' }]);
  });

  it('writes a markdown table that escapes pipes', () => {
    const text = markdown(summarize(REPORT));
    expect(text).toStartWith('### Unit tests: ❌ 1 passed, 1 failed, 1 skipped');
    expect(text).toContain('| `a.test.ts` | breaks \\| badly | expected 1 < 2 |');
  });

  it('a clean run is a single green line', () => {
    expect(markdown(summarize('<testsuites><testcase name="ok" file="b.test.ts"/></testsuites>'))).toBe('### Unit tests: ✅ 1 passed, 0 failed\n\n');
  });
});
