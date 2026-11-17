import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeScenario, defaultScenarioRoot, openScenario, SCENARIOS, type ScenarioLaunch } from '@studio/fixtures';
import { leaks, scrub } from '../tests/live/recording.js';

const USAGE = `bun run scenario <name> [--live] [--record <file>] [--no-login] [--hidden] [--port <n>]
bun run scenario --list
bun run scenario --stop

Opens Studio in one first-run scenario on scratch state, replacing the scenario open before it, signed
in with this machine's Claude login. Running the same name again resets it. A scenario marked "replays"
answers its scripted turns from its recording, and every later prompt in the app from the same
recording, so a prompt past it fails; --live runs the scripted turns for real instead, so the
conversation can continue, and --record re-records them into <file>. In the other scenarios a typed
prompt runs live. --no-login keeps the machine's login out: the composer then reads signed in without
one, and only recorded prompts answer.`;

function list(): void {
  console.log(`${USAGE}\n`);
  for (const [name, scenario] of Object.entries(SCENARIOS)) {
    const replays = scenario.replay !== undefined && scenario.replay.onlyWithoutLogin !== true;
    console.log(`  ${name.padEnd(18)} ${scenario.ticket}  ${replays ? '(replays) ' : ''}${scenario.what}`);
  }
}

type Row = Record<string, unknown>;
const isRow = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
const IMAGE_ELIDED = { type: 'text', text: '[image elided: a replay answers this tool live]' };

/** A Studio tool's recorded answer is replaced by this run's on replay, so its screenshots are dead weight in the file. */
function elideStudioImages(row: unknown, studioCalls: Set<string>): unknown {
  if (!isRow(row) || row['type'] !== 'user' || !isRow(row['message']) || !Array.isArray(row['message']['content'])) return row;
  let elided = false;
  const content = (row['message']['content'] as unknown[]).map((block) => {
    if (!isRow(block) || block['type'] !== 'tool_result' || !studioCalls.has(String(block['tool_use_id'])) || !Array.isArray(block['content'])) return block;
    elided = true;
    return { ...block, content: (block['content'] as unknown[]).map((part) => (isRow(part) && part['type'] === 'image' ? IMAGE_ELIDED : part)) };
  });
  if (!elided) return row;
  const { tool_use_result: _answer, ...rest } = row;
  return { ...rest, message: { ...row['message'], content } };
}

function studioCallIds(rows: unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!isRow(row) || row['type'] !== 'assistant' || !isRow(row['message']) || !Array.isArray(row['message']['content'])) continue;
    for (const block of row['message']['content'] as unknown[]) {
      if (isRow(block) && block['type'] === 'tool_use' && String(block['name']).startsWith('mcp__studio__')) ids.add(String(block['id']));
    }
  }
  return ids;
}

export function writeScrubbed(raw: string, out: string): void {
  const read = readFileSync(raw, 'utf8').split('\n').filter((line) => line.trim() !== '').map((line) => JSON.parse(line) as unknown);
  const studioCalls = studioCallIds(read);
  const rows = read.map((row) => elideStudioImages(row, studioCalls));
  const lines = scrub('claude', { scenario: rows })['scenario'] ?? [];
  const text = `${lines.join('\n')}\n`;
  const found = leaks(text);
  if (found.length > 0) throw new Error(`The recording still carries ${found.join(', ')}; nothing was written to ${out}.`);
  writeFileSync(out, text);
}

async function main(args: string[]): Promise<number> {
  const [name, ...rest] = args;
  if (name === undefined || name === '--list' || name === '-l') {
    list();
    return name === undefined ? 1 : 0;
  }
  const root = defaultScenarioRoot();
  if (name === '--stop') {
    await closeScenario(root);
    console.log(`scenario: stopped, and ${root} is cleared.`);
    return 0;
  }
  const launch: ScenarioLaunch = { root, headed: true, login: true };
  let recordTo: string | undefined;
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    if (flag === '--live') launch.live = true;
    else if (flag === '--hidden') launch.headed = false;
    else if (flag === '--no-login') launch.login = false;
    else if (flag === '--record' && rest[index + 1]) recordTo = rest[++index];
    else if (flag === '--port' && rest[index + 1]) launch.port = rest[++index]!;
    else {
      console.error(`scenario: unknown argument ${String(flag)}\n\n${USAGE}`);
      return 1;
    }
  }
  if (recordTo !== undefined) launch.record = join(root, 'recording.raw.jsonl');
  const opened = await openScenario(name, launch);
  if (recordTo !== undefined && launch.record !== undefined) {
    writeScrubbed(launch.record, recordTo);
    console.log(`scenario: recorded ${name}'s turns to ${recordTo}`);
  }
  console.log(`scenario: ${name} is open (pid ${String(opened.app.pid)}, debugging port ${opened.app.port}).`);
  if (opened.sourcePath !== undefined) console.log(`  import: ${opened.sourcePath}  (⇧⌘G in the folder picker)`);
  console.log(`  reset:  bun run scenario ${name}`);
  console.log('  stop:   bun run scenario --stop');
  return 0;
}

if (import.meta.main) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error: unknown) => {
      console.error(`scenario: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    },
  );
}
