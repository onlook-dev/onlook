import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { windowsSigning } from './windows-signing.js';
import { assertWindowsUpdateSignature } from './windows-update-signature.js';
import { artifactNames, feedNames, feedProblems } from './release-targets.js';
import { packagedWindowsProblems } from './windows-arch.js';
import { builderReleaseArgs, releaseOptions } from './release-channel.js';
import { commitCount, stamp } from './version.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'apps/studio');
const release = join(root, 'release');
const args = process.argv.slice(2);
const { channel, version: requestedVersion } = releaseOptions(args, true);
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Build Windows x64 on a Windows x64 runner');
const manifest = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8')) as { version: string; productName: string };
const officialBuild = process.env['STUDIO_CLOUD_BUILD'] === '1';
const productName = officialBuild ? manifest.productName : 'Onlook Source';
const version = requestedVersion ?? (channel === undefined ? manifest.version : stamp(manifest.version, commitCount(root), channel));
const signing = windowsSigning(process.env);
const sdkRequire = createRequire(createRequire(join(app, 'package.json')).resolve('@anthropic-ai/claude-agent-sdk'));
sdkRequire.resolve('@anthropic-ai/claude-agent-sdk-win32-x64/claude.exe');
const scratch = mkdtempSync(join(tmpdir(), 'onlook-win-cut-'));
const config = join(scratch, 'windows.json');
writeFileSync(config, JSON.stringify({
  extends: join(app, officialBuild ? 'electron-builder.official.yml' : 'electron-builder.yml'),
  forceCodeSigning: signing.forceCodeSigning,
  win: signing.win,
}));

function run(argv: string[]): void {
  const result = spawnSync(process.execPath, argv, { cwd: app, stdio: 'inherit', windowsHide: true, env: { ...process.env, STUDIO_CLOUD_BUILD: officialBuild ? '1' : '0' } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Windows cut failed (${String(result.status)})`);
}

console.log(signing.unsigned ? 'EXPLICIT UNSIGNED WINDOWS BUILD, for review only: it is never staged or published, and SmartScreen will not recognize a verified publisher.' : 'Windows build requires Azure Trusted Signing. Signing failures abort the cut.');
run(['run', 'build']);
run(['x', '--no-install', 'electron-builder', '--win', '--x64', '--config', config, ...builderReleaseArgs(channel, version, officialBuild), '--publish', 'never', ...(args.includes('--dir') ? ['--dir'] : [])]);
const problems = packagedWindowsProblems(join(release, 'win-unpacked'), productName);
if (problems.length) throw new Error(problems.join('\n'));
if (!args.includes('--dir')) {
  for (const name of artifactNames(productName, version, 'win')) {
    if (!existsSync(join(release, name))) throw new Error(`Missing Windows payload: ${name}`);
  }
  const feedProblemsFound = officialBuild ? feedProblems(readFileSync(join(release, feedNames('win', channel)[0]!), 'utf8'), productName, version, 'win') : [];
  if (feedProblemsFound.length) throw new Error(feedProblemsFound.join('\n'));
  if (officialBuild && !signing.unsigned) {
    assertWindowsUpdateSignature(join(release, 'win-unpacked'), join(release, artifactNames(productName, version, 'win')[0]!));
  }
}
writeFileSync(join(release, 'signing-win.txt'), signing.unsigned ? 'unsigned' : 'signed');
console.log('Windows cut complete. Nothing was uploaded or published.');
