// A JUnit report as a CI test summary: a markdown table for the job summary, and one error
// annotation per failed test so a red run names its tests in the PR (`test:report` writes the report).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

interface Failure { file: string; name: string; message: string }

const attr = (tag: string, name: string): string => {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return match ? decode(match[1]!) : '';
};
const decode = (text: string): string =>
  text.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function summarize(xml: string): { passed: number; failed: number; skipped: number; failures: Failure[] } {
  let passed = 0, failed = 0, skipped = 0;
  const failures: Failure[] = [];
  for (const match of xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const tag = match[1]!, body = match[3] ?? '';
    const failure = /<(failure|error)\b([^>]*)>?/.exec(body);
    if (failure) {
      failed++;
      failures.push({ file: attr(tag, 'file'), name: attr(tag, 'name'), message: attr(` ${failure[2]}`, 'message') || failure[1]! });
    } else if (/<skipped\b/.test(body)) skipped++;
    else passed++;
  }
  return { passed, failed, skipped, failures };
}

export function markdown({ passed, failed, skipped, failures }: ReturnType<typeof summarize>): string {
  const lines = [`### Unit tests: ${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}`, ''];
  if (failures.length) {
    lines.push('| File | Test | Message |', '| --- | --- | --- |');
    for (const f of failures.slice(0, 50)) lines.push(`| \`${f.file}\` | ${f.name.replace(/[\\|]/g, '\\$&')} | ${f.message.split('\n')[0]!.replace(/[\\|]/g, '\\$&').slice(0, 200)} |`);
    if (failures.length > 50) lines.push('', `…and ${failures.length - 50} more.`);
  }
  return `${lines.join('\n')}\n`;
}

if (import.meta.main) {
  const path = process.argv[2] ?? '.test-results/unit.xml';
  if (!existsSync(path)) {
    console.log(`No JUnit report at ${path}; nothing to summarize.`);
    process.exit(0);
  }
  const result = summarize(readFileSync(path, 'utf8'));
  for (const f of result.failures) console.log(`::error file=${f.file},title=${f.name.replace(/[,:\n]/g, ' ')}::${f.message.split('\n')[0]!.replace(/[\r\n]/g, ' ')}`);
  const target = process.env['GITHUB_STEP_SUMMARY'];
  if (target) appendFileSync(target, markdown(result));
  else process.stdout.write(markdown(result));
}
