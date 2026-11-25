import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { banner, bold, dim, green, red, yellow } from './ansi.js';
import { packagedArchProblems } from './app-arch.js';
import { assertMacSigningIdentity } from './mac-signing.js';
import { artifactNames, MAC_ARCHES, packagedAppPath, type MacArch } from './release-targets.js';
import { assessesGatekeeper, meetsMinimum, minimumTier, signingGuidance, TIER_RANK, type Tier } from './tier.js';
import { builderReleaseArgs, releaseOptions } from './release-channel.js';
import { commitCount, stamp } from './version.js';
import { packageMac, stapleAndValidate, validateStapledTicket } from './mac-notarization.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(repoRoot, 'apps/studio');
const releaseDir = join(repoRoot, 'release');
const appManifest = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8')) as { productName: string; version: string };
const officialBuild = process.env['STUDIO_CLOUD_BUILD'] === '1';
const productName = officialBuild ? appManifest.productName : 'Onlook Source';

function step(label: string): void {
  console.log(`\n${bold(`▸ ${label}`)}`);
}

function run(cmd: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): void {
  console.log(dim(`  $ ${cmd} ${args.join(' ')}`));
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env, STUDIO_CLOUD_BUILD: officialBuild ? '1' : '0' },
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} exited ${result.status ?? 'by signal ' + result.signal}`);
  }
}

function tryRun(cmd: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): number {
  console.log(dim(`  $ ${cmd} ${args.join(' ')}`));
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env, STUDIO_CLOUD_BUILD: officialBuild ? '1' : '0' },
  });
  return result.status ?? 1;
}

function capture(cmd: string, args: string[]): SpawnSyncReturns<string> {
  return spawnSync(cmd, args, { encoding: 'utf8' });
}

const args = process.argv.slice(2);
const dirOnly = args.includes('--dir');
const options = releaseOptions(args, true);
const channel = options.channel ?? 'latest';
const stampedVersion = options.version ?? (options.channel === undefined ? undefined : stamp(appManifest.version, commitCount(repoRoot), options.channel));

if (process.platform !== 'darwin') throw new Error('Mac cuts must run on macOS. Use build:windows on Windows.');
const sdkRequire = createRequire(createRequire(join(appDir, 'package.json')).resolve('@anthropic-ai/claude-agent-sdk'));
for (const arch of MAC_ARCHES) {
  try {
    sdkRequire.resolve(`@anthropic-ai/claude-agent-sdk-darwin-${arch}/claude`);
  } catch {
    throw new Error(`Missing Claude package for ${arch}. Run bun install --cpu='*' before cutting both Mac builds.`);
  }
}

const requireNotarized = args.includes('--require-notarized');

const profileFlagIndex = args.indexOf('--notary-profile');
const notaryProfile =
  (profileFlagIndex >= 0 ? args[profileFlagIndex + 1] : undefined) ??
  process.env['APPLE_NOTARY_KEYCHAIN_PROFILE'];

const isSet = (key: string): boolean => (process.env[key] ?? '').length > 0;

const isUsable = (key: string): boolean => {
  const value = process.env[key] ?? '';
  return value.length > 0 && !value.startsWith('FILL_ME');
};

const NOTARY_ENV_MAP: ReadonlyArray<readonly [builder: string, namespaced: string]> = [
  ['APPLE_ID', 'ONLOOK_APPLE_ID'],
  ['APPLE_APP_SPECIFIC_PASSWORD', 'ONLOOK_APPLE_NOTARY_PASSWORD'],
  ['APPLE_TEAM_ID', 'ONLOOK_APPLE_TEAM_ID'],
];

const NOTARY_API_ENV_MAP: ReadonlyArray<readonly [builder: string, namespaced: string]> = [
  ['APPLE_API_KEY_ID', 'ONLOOK_APPLE_API_KEY_ID'],
  ['APPLE_API_ISSUER', 'ONLOOK_APPLE_API_ISSUER'],
];
const API_KEY_CONTENT = 'ONLOOK_APPLE_API_KEY_CONTENT';

// electron-builder's APPLE_API_KEY is a file path and a CI secret is content: a 0600 temp file, removed on exit (ONL-2132).
function materializeApiKey(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'onlook-notary-'));
  const keyPath = join(dir, 'AuthKey.p8');
  writeFileSync(keyPath, content, { mode: 0o600 });
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
  return keyPath;
}

function resolveNotaryEnv():
  | { env: NodeJS.ProcessEnv; source: string }
  | { env: undefined; reason: string } {
  const apiSlots = [...NOTARY_API_ENV_MAP.map(([, namespaced]) => namespaced), API_KEY_CONTENT];
  const apiMissing = apiSlots.filter((namespaced) => !isUsable(namespaced));
  const missing = NOTARY_ENV_MAP.filter(([, namespaced]) => !isUsable(namespaced));

  if (apiMissing.length === 0) {
    const env: NodeJS.ProcessEnv = {};
    for (const [builder, namespaced] of NOTARY_API_ENV_MAP) env[builder] = process.env[namespaced];
    env['APPLE_API_KEY'] = materializeApiKey(process.env[API_KEY_CONTENT]!);
    return { env, source: 'ONLOOK_APPLE_API_* (ASC key, mapped for this build only)' };
  }

  if (missing.length === 0) {
    const env: NodeJS.ProcessEnv = {};
    for (const [builder, namespaced] of NOTARY_ENV_MAP) env[builder] = process.env[namespaced];
    return { env, source: 'ONLOOK_APPLE_* (mapped for this build only)' };
  }

  // Ambient APPLE_* is already in the child's environment; nothing to map.
  if (
    NOTARY_ENV_MAP.every(([builder]) => isUsable(builder)) ||
    ['APPLE_API_KEY', ...NOTARY_API_ENV_MAP.map(([builder]) => builder)].every(isUsable)
  ) {
    return { env: {}, source: 'ambient APPLE_* (already in the environment)' };
  }

  const flavors: ReadonlyArray<readonly [total: number, missingSlots: string[]]> = [
    [NOTARY_ENV_MAP.length, missing.map(([, namespaced]) => namespaced)],
    [apiSlots.length, apiMissing],
  ];
  const partial = flavors.filter(([total, miss]) => miss.length > 0 && miss.length < total);
  const detail = partial
    .flatMap(([, miss]) => miss)
    .map((namespaced) => `${namespaced}=${isSet(namespaced) ? 'FILL_ME' : 'unset'}`)
    .join(', ');
  return {
    env: undefined,
    reason: partial.length === 0 ? 'no notary credentials' : `incomplete credentials — ${detail}`,
  };
}

const notaryEnv = resolveNotaryEnv();
const hasNotaryEnv = notaryEnv.env !== undefined;

function findDeveloperIdIdentity(): string | undefined {
  // CSC_LINK / CSC_NAME supply the identity out-of-band (a .p12 in CI), invisible to the keychain query.
  if (isSet('CSC_LINK') || isSet('CSC_NAME')) return '(supplied via CSC_* environment)';
  const out = capture('security', ['find-identity', '-v', '-p', 'codesigning']).stdout ?? '';
  const match = out.split('\n').find((line) => line.includes('Developer ID Application'));
  return match?.match(/"(.+)"/)?.[1];
}

const identity = findDeveloperIdIdentity();
const intendedTier: Tier = !identity
  ? 'unsigned'
  : hasNotaryEnv || notaryProfile
    ? 'notarized'
    : 'signed-unnotarized';

step('Signing preflight');
console.log(`  Developer ID identity ... ${identity ? green(identity) : officialBuild ? red('none in keychain') : dim('not needed for a local build')}`);
let notaryStatus: string;
if (notaryEnv.env !== undefined) {
  notaryStatus = green(`${notaryEnv.source} — in-band notarization`);
} else if (notaryProfile) {
  notaryStatus = green(`keychain profile "${notaryProfile}" — post-hoc notarization`);
} else if (officialBuild) {
  notaryStatus = yellow(notaryEnv.reason);
} else {
  notaryStatus = dim('not needed for a local build');
}
console.log(`  Notary credentials ...... ${notaryStatus}`);
if (officialBuild && notaryEnv.env === undefined && !notaryProfile) {
  console.log(dim('    To notarize, supply Apple notary credentials or use --notary-profile.'));
}
console.log(`  Intended tier ........... ${bold(intendedTier)}`);
if (officialBuild) {
  console.log(
    `  Minimum tier ............ ${bold(minimumTier(requireNotarized))} ${dim(
      requireNotarized
        ? '(--require-notarized: a degraded cut aborts instead of shipping)'
        : '(default: a notarization failure degrades and still produces a build)',
    )}`,
  );
  console.log(
    `  Update channel .......... ${bold(channel)} ${dim(
      `(feed file ${channel}-mac.yml; baked into the build's app-update.yml)`,
    )}`,
  );
} else {
  console.log(dim('  Local source build ...... no signing credentials or update feed required'));
}
console.log(
  `  Version ................. ${bold(stampedVersion ?? appManifest.version)} ${dim(
    stampedVersion ? '(stamped; the tree is untouched)' : '(from apps/studio/package.json)',
  )}`,
);

if (officialBuild && intendedTier === 'unsigned') {
  banner(
    [
      red(bold('No Developer ID identity found.')),
      '',
      'This build will be ad-hoc signed for local use.',
      'Distribution requires a Developer ID and notarization.',
    ],
    red,
  );
}

step('Building renderer / preload / main (electron-vite)');
run('bun', ['run', 'build'], appDir);

// Before packaging: extraResources carries it inside the signed bundle.
step('Preparing in-app DMG background (retina tiff)');
const dmgBackgroundTiff = join(appDir, 'build/dmg-background.tiff');
rmSync(dmgBackgroundTiff, { force: true });
run(
  'tiffutil',
  [
    '-cathidpicheck',
    join(appDir, 'resources/brand/dmg-background.jpg'),
    join(appDir, 'resources/brand/dmg-background@2x.jpg'),
    '-out',
    dmgBackgroundTiff,
  ],
  appDir,
);

step(`Packaging (${dirOnly ? '--dir, no installer' : 'dmg + zip'}, channel ${channel})`);
const builderArgs = ['--mac', '--arm64', '--x64', '--config', officialBuild ? 'electron-builder.official.yml' : 'electron-builder.yml'];
if (!officialBuild && !identity) builderArgs.push('-c.mac.identity=-');
if (dirOnly) builderArgs.push('--dir');
if (process.env['ELECTRON_CACHE']) builderArgs.push(`-c.electronDownload.cache=${process.env['ELECTRON_CACHE']}`);

// Explicit, not inferred from the version string; lands `channel:` in the shipped app-update.yml for life.
builderArgs.push(...builderReleaseArgs(options.channel, stampedVersion, officialBuild));

// A build that publishes as a side effect ships an unsigned DMG unnoticed.
builderArgs.push('--publish', 'never');

// Notary credentials reach this one spawnSync and never process.env, so nothing else inherits an un-prefixed Apple credential.
const builderEnv: NodeJS.ProcessEnv = { ...notaryEnv.env };
if (!identity) builderEnv['CSC_IDENTITY_AUTO_DISCOVERY'] = 'false';

const builderBin = join(appDir, 'node_modules/.bin/electron-builder');
const notarizationFailed = await packageMac((notarize) => {
  const env: NodeJS.ProcessEnv = notarize ? { ...builderEnv } : {};
  env['ONLOOK_NOTARIZE_APP'] = notarize ? '1' : '0';
  if (!identity) env['CSC_IDENTITY_AUTO_DISCOVERY'] = 'false';
  return tryRun(builderBin, builderArgs, appDir, env);
}, { notarize: hasNotaryEnv, requireNotarized, dirOnly }, () => {
  banner(
    [
      yellow(bold('Packaging failed with notarization enabled.')),
      '',
      'Retrying as a signed, unnotarized cut so the day still has a build.',
      'The recipient will need the Open Anyway dance — say so when you send it.',
      '',
      'Common causes: Apple notary service down, expired developer',
      'agreements (a 403 from notarytool), or no network.',
    ],
    yellow,
  );
});

function findArtifacts(arch: MacArch): { dmg?: string; zip?: string; feed?: string } {
  if (!existsSync(releaseDir)) return {};
  const expected = artifactNames(productName, stampedVersion ?? appManifest.version, 'mac');
  const exact = (suffix: string): string | undefined => {
    const name = expected.find((entry) => entry.endsWith(suffix));
    return name && existsSync(join(releaseDir, name)) ? join(releaseDir, name) : undefined;
  };
  // A cut also emits the other channels' `-mac.yml`; this is the one baked into the .app.
  const feedName = `${channel}-mac.yml`;
  return {
    dmg: exact(`-${arch}.dmg`),
    zip: exact(`-${arch}-mac.zip`),
    feed: officialBuild && existsSync(join(releaseDir, feedName)) ? join(releaseDir, feedName) : undefined,
  };
}

let minimumObservedTier: Tier = 'notarized';
for (const arch of MAC_ARCHES) {
const packagedApp = packagedAppPath(releaseDir, productName, arch);
const nativeProblems = packagedArchProblems(packagedApp, arch);
if (nativeProblems.length > 0) throw new Error(nativeProblems.join('\n'));
let { dmg, zip, feed } = findArtifacts(arch);
if (!dirOnly && (!dmg || !zip || (officialBuild && !feed))) throw new Error(`Missing installer, ZIP or required feed for ${arch}`);

function findVendoredDmgbuildPython(): { python: string; lib: string } | undefined {
  const cacheRoots = [
    process.env['ELECTRON_BUILDER_CACHE'],
    join(homedir(), 'Library/Caches/electron-builder'),
  ].filter((r): r is string => !!r && existsSync(r));
  for (const cacheRoot of cacheRoots) {
    for (const toolset of readdirSync(cacheRoot).filter((e) => e.startsWith('dmg-builder@'))) {
      const toolsetDir = join(cacheRoot, toolset);
      if (!statSync(toolsetDir).isDirectory()) continue;
      for (const bundle of readdirSync(toolsetDir).filter((e) => e.startsWith('dmgbuild-bundle-'))) {
        const python = join(toolsetDir, bundle, 'python/bin/python3');
        const lib = join(toolsetDir, bundle, 'python/lib');
        if (existsSync(python) && existsSync(lib)) return { python, lib };
      }
    }
  }
  return undefined;
}

function patchFeedsForDmg(dmgName: string, sha512: string, size: number): string[] {
  const patched: string[] = [];
  for (const entry of readdirSync(releaseDir).filter((e) => e.endsWith('-mac.yml'))) {
    const feedPath = join(releaseDir, entry);
    const lines = readFileSync(feedPath, 'utf8').split('\n');
    let inDmgEntry = false;
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (/^\s*-\s+url:/.test(line)) {
        inDmgEntry = line.includes(dmgName);
      } else if (/^\S/.test(line)) {
        // Top-level keys (path:, sha512:, releaseDate:) describe the zip, never the dmg.
        inDmgEntry = false;
      } else if (inDmgEntry && /^\s*sha512:/.test(line)) {
        lines[i] = `${line.slice(0, line.indexOf('sha512:'))}sha512: ${sha512}`;
        changed = true;
      } else if (inDmgEntry && /^\s*size:/.test(line)) {
        lines[i] = `${line.slice(0, line.indexOf('size:'))}size: ${size}`;
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(feedPath, lines.join('\n'));
      patched.push(entry);
    }
  }
  return patched;
}

function parseAttach(output: string): { device: string; volume: string } {
  const device = /^(\/dev\/\w+)/m.exec(output)?.[1];
  let volume: string | undefined;
  for (const line of output.split('\n')) {
    const match = /\s(\/Volumes\/.+?)\s*$/.exec(line);
    if (match) {
      volume = match[1]!.trim();
      break;
    }
  }
  if (!device || !volume) throw new Error(`Cannot parse hdiutil attach output:\n${output}`);
  return { device, volume };
}

async function detachDevice(device: string): Promise<void> {
  const first = capture('hdiutil', ['detach', '-quiet', device]);
  if (first.status === 0) return;
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const second = capture('hdiutil', ['detach', '-force', device]);
  if (second.status !== 0) throw new Error(`hdiutil detach failed: ${second.stderr}`);
}

async function tidyDmgWindow(dmgPath: string): Promise<void> {
  const vendored = findVendoredDmgbuildPython();
  if (!vendored) {
    throw new Error(
      'vendored dmgbuild python not found in the electron-builder cache — ' +
        'it should have been downloaded by the DMG build that just ran',
    );
  }

  const scratchDir = join(releaseDir, '.dmg-tidy');
  rmSync(scratchDir, { recursive: true, force: true });
  mkdirSync(scratchDir, { recursive: true });
  const rwImage = join(scratchDir, 'rw.dmg');
  const tidiedImage = join(scratchDir, 'tidied.dmg');

  try {
    run('hdiutil', ['convert', dmgPath, '-quiet', '-format', 'UDRW', '-ov', '-o', rwImage], repoRoot);

    const attach = capture('hdiutil', ['attach', '-nobrowse', '-noautoopen', rwImage]);
    if (attach.status !== 0) throw new Error(`hdiutil attach failed: ${attach.stderr}`);
    const { device, volume } = parseAttach(attach.stdout ?? '');

    try {
      const appName = readdirSync(volume).find((e) => e.endsWith('.app'));
      if (!appName) throw new Error(`no .app on the mounted volume ${volume}`);
      const inAppBackground = join(
        volume,
        appName,
        'Contents/Resources',
        basename(dmgBackgroundTiff),
      );
      if (!existsSync(inAppBackground)) {
        throw new Error(`in-app background missing: ${inAppBackground} — check extraResources`);
      }

      const aliasScript = [
        'import sys',
        'from ds_store import DSStore',
        'from mac_alias import Alias',
        'alias = Alias.for_file(sys.argv[2])',
        'with DSStore.open(sys.argv[1], "r+") as d:',
        '    icvp = d["."]["icvp"]',
        '    icvp["backgroundImageAlias"] = alias.to_bytes()',
        '    d["."]["icvp"] = icvp',
      ].join('\n');
      const rewrite = spawnSync(
        vendored.python,
        ['-c', aliasScript, join(volume, '.DS_Store'), inAppBackground],
        { encoding: 'utf8', env: { ...process.env, PYTHONPATH: vendored.lib } },
      );
      if (rewrite.status !== 0) throw new Error(`ds_store alias rewrite failed: ${rewrite.stderr}`);

      // Deleted, not parked off-window: Finder's content rect covers every item, so parking draws a permanent scrollbar (ONL-1947).
      rmSync(join(volume, '.background.tiff'), { force: true });
      rmSync(join(volume, '.VolumeIcon.icns'), { force: true });
      rmSync(join(volume, '.fseventsd'), { recursive: true, force: true });
      rmSync(join(volume, '.Trashes'), { recursive: true, force: true });

      const expected = new Set(['.DS_Store', 'Applications', appName]);
      const leftover = readdirSync(volume).filter((e) => !expected.has(e));
      if (leftover.length > 0) {
        throw new Error(`unexpected items still at the volume root: ${leftover.join(', ')}`);
      }
    } finally {
      await detachDevice(device);
    }

    run(
      'hdiutil',
      [
        'convert',
        rwImage,
        '-quiet',
        '-format',
        'UDZO',
        '-imagekey',
        'zlib-level=9',
        '-ov',
        '-o',
        tidiedImage,
      ],
      repoRoot,
    );
    rmSync(dmgPath);
    renameSync(tidiedImage, dmgPath);

    const blockMapFile = `${dmgPath}.blockmap`;
    const appRequire = createRequire(join(appDir, 'noop.js'));
    const builderRequire = createRequire(appRequire.resolve('electron-builder/package.json'));
    const { buildBlockMap } = builderRequire('app-builder-lib/out/targets/blockmap/blockmap.js') as {
      buildBlockMap: (
        inFile: string,
        format: 'gzip' | 'deflate',
        outFile: string,
      ) => Promise<{ sha512: string; size: number }>;
    };
    const { sha512, size } = await buildBlockMap(dmgPath, 'gzip', blockMapFile);
    const patchedFeeds = officialBuild ? patchFeedsForDmg(basename(dmgPath), sha512, size) : [];
    console.log(
      `  volume root is clean (app + Applications only); refreshed ${
        patchedFeeds.length > 0 ? patchedFeeds.join(', ') : 'no feeds'
      } + ${basename(blockMapFile)}`,
    );
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}

let windowTidied = false;
// Before post-hoc notarization: stapling must land on the final bytes.
if (dmg && !dirOnly) {
  step('Tidying the install window (background into the app, volume root left clean)');
  try {
    await tidyDmgWindow(dmg);
    windowTidied = true;
  } catch (error) {
    banner(
      [
        yellow(bold('Install-window tidy failed — shipping the untidied DMG.')),
        '',
        'The DMG works, but a Finder showing hidden files will render',
        '.background.tiff as a stray icon in the install window.',
        '',
        String(error instanceof Error ? error.message : error),
      ],
      yellow,
    );
  }
}

if (notaryProfile && !hasNotaryEnv && dmg) {
  step(`Notarizing via keychain profile "${notaryProfile}"`);
  console.log(dim('  Typically 2–5 minutes. notarytool reads the profile itself; no secret here.'));
  const submit = spawnSync(
    'xcrun',
    ['notarytool', 'submit', dmg, '--keychain-profile', notaryProfile, '--wait'],
    { stdio: 'inherit' },
  );
  if (submit.status === 0) {
    await stapleAndValidate(dmg);
    // An unstapled .app has to reach Apple over the network to prove it was notarized.
    await stapleAndValidate(packagedApp);
  } else {
    console.log(
      yellow(
        '  Notarization did not succeed. The DMG is still signed — the cut degrades\n' +
          '  to signed-unnotarized rather than failing. See the verdict below.',
      ),
    );
  }
}

step('Verifying the artifact');

const codesign = capture('codesign', ['--verify', '--strict', '--verbose=2', packagedApp]);
const ok = codesign.status === 0;
console.log(`  codesign --verify ....... ${ok ? green('valid') : red('INVALID')}`);
if (!ok) console.log(dim(`    ${(codesign.stderr ?? '').trim().split('\n').join('\n    ')}`));
if (!ok && (!dirOnly || !officialBuild)) throw new Error(`Invalid signature on ${arch} app`);
if (officialBuild && intendedTier !== 'unsigned') {
  const signature = capture('codesign', ['-d', '-r-', '--verbose=4', packagedApp]);
  if (signature.status !== 0) throw new Error('Cannot inspect packaged signing identity');
  assertMacSigningIdentity(`${signature.stdout ?? ''}\n${signature.stderr ?? ''}`);
  console.log('  signing continuity ..... com.onlook.studio / WLQ3KTS8SZ');
}

let observedTier: Tier = 'unsigned';

if (assessesGatekeeper(intendedTier, officialBuild)) {
  // Read off the .app: electron-builder 26 leaves the .dmg unsigned, so assessing it reports UNSIGNED for a shippable build.
  // spctl exits non-zero for a signed-unnotarized app; the `source=` line carries the verdict, not the status.
  const spctl = capture('spctl', ['-a', '-t', 'exec', '-vv', packagedApp]);
  const assessment = `${(spctl.stdout ?? '').trim()} ${(spctl.stderr ?? '').trim()}`.trim();

  if (/source=Notarized Developer ID/.test(assessment)) observedTier = 'notarized';
  else if (/source=Unnotarized Developer ID/.test(assessment)) observedTier = 'signed-unnotarized';
  else if (/origin=Developer ID Application/.test(assessment)) observedTier = 'signed-unnotarized';

  console.log(`  gatekeeper (the app) .... ${dim(assessment.replace(/\n/g, ' | '))}`);
} else {
  console.log(`  gatekeeper (the app) .... ${dim('not applicable (ad-hoc signed local build)')}`);
}

const stapled = observedTier !== 'unsigned' && await validateStapledTicket(packagedApp).then(() => true, () => false);
if (observedTier === 'notarized' && !stapled) observedTier = 'signed-unnotarized';
console.log(`  stapled ticket .......... ${stapled ? green('present (validates offline)') : observedTier === 'unsigned' ? dim('not applicable (ad-hoc signed)') : yellow('none')}`);

if (dmg) {
  const dmgSigned = capture('codesign', ['-dv', dmg]).status === 0;
  console.log(
    `  dmg container ........... ${dim(
      dmgSigned ? 'signed' : 'unsigned (normal for electron-builder; the app inside is what counts)',
    )}`,
  );
}

const mb = (path: string): string => `${(statSync(path).size / 1024 / 1024).toFixed(1)} MB`;

const tierColor = { notarized: green, 'signed-unnotarized': yellow, unsigned: officialBuild ? red : dim }[observedTier];
if (TIER_RANK[observedTier] < TIER_RANK[minimumObservedTier]) minimumObservedTier = observedTier;

const verdict: string[] = [
  officialBuild ? `${bold('SIGNING TIER:')} ${tierColor(bold(observedTier.toUpperCase()))}` : `${bold('Onlook Source built:')} ${bold(arch)} · ${stampedVersion ?? appManifest.version}`,
  '',
  ...signingGuidance(observedTier, officialBuild).split('\n'),
];

// `--dir` produces no installer, so there is no tier to hold it to.
const shippable = !officialBuild || dirOnly || meetsMinimum(observedTier, requireNotarized);

if (notarizationFailed) {
  verdict.push(
    '',
    yellow('Notarization was attempted and failed; this is the fallback cut.'),
    shippable
      ? yellow('Shippable, but the recipient hits Gatekeeper. Fix before it becomes routine.')
      : red('REFUSED: --require-notarized was passed, so this cut does not ship.'),
  );
} else if (TIER_RANK[observedTier] < TIER_RANK[intendedTier]) {
  verdict.push(
    '',
    yellow(`Intended ${intendedTier} but produced ${observedTier} — the credentials`),
    yellow('were present but the notarization did not land. Check the log above.'),
  );
}

if (dmg && !dirOnly && !windowTidied) {
  verdict.push('', yellow('Install window NOT tidied — stray hidden-file icons remain (see above).'));
}

verdict.push('', bold('Artifacts'));
if (dirOnly) verdict.push(`  ${packagedApp.replace(repoRoot + '/', '')}`);
if (dmg) verdict.push(`  ${dmg.replace(repoRoot + '/', '')}  ${dim(mb(dmg))}   ${dim('← install')}`);
if (zip) verdict.push(`  ${zip.replace(repoRoot + '/', '')}  ${dim(mb(zip))}   ${dim(officialBuild ? '← updater' : '← app archive')}`);
if (feed) verdict.push(`  ${feed.replace(repoRoot + '/', '')}          ${dim('← updater feed')}`);
if (!dmg && !dirOnly) verdict.push(red('  No .dmg produced.'));

if (!shippable) {
  verdict.push(
    '',
    red(bold(`Below the ${minimumTier(requireNotarized)} floor this cut was held to.`)),
    red('Exiting non-zero.'),
  );
}

verdict.push('', dim('Nothing was published.'));

banner(verdict, tierColor);

// The only place a cut below its floor becomes a non-zero exit; every command inside it exited 0.
if (!shippable) process.exitCode = 1;
}
if (!process.exitCode) writeFileSync(join(releaseDir, 'signing-mac.txt'), minimumObservedTier);
