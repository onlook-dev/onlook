import { join } from 'node:path';
import type { ReleaseChannel } from './release-channel.js';

export const MAC_ARCHES = ['arm64', 'x64'] as const;
export type MacArch = (typeof MAC_ARCHES)[number];
export const PLATFORMS = ['mac', 'win'] as const;
export type ReleasePlatform = (typeof PLATFORMS)[number];

export function packagedAppPath(releaseDir: string, product: string, arch: MacArch): string {
  return join(releaseDir, arch === 'x64' ? 'mac' : `mac-${arch}`, `${product}.app`);
}

export function artifactNames(product: string, version: string, platform: ReleasePlatform): string[] {
  return platform === 'mac'
    ? MAC_ARCHES.flatMap((arch) => [
        `${product}-${version}-${arch}.dmg`,
        `${product}-${version}-${arch}-mac.zip`,
        `${product}-${version}-${arch}-mac.zip.blockmap`,
      ])
    : [`${product}-${version}-x64.exe`, `${product}-${version}-x64.exe.blockmap`];
}

export function feedNames(platform: ReleasePlatform, channel?: ReleaseChannel): string[] {
  if (channel !== undefined) return [platform === 'mac' ? `${channel}-mac.yml` : `${channel}.yml`];
  return platform === 'mac' ? ['latest-mac.yml', 'beta-mac.yml'] : ['latest.yml', 'beta.yml'];
}

export function feedAddresses(feed: string): string[] {
  const addresses = new Set<string>();
  for (const line of feed.split('\n')) {
    const match = /^(?:\s*-\s+url:|path:)\s*(.+?)\s*$/.exec(line);
    if (match?.[1]) addresses.add(match[1]);
  }
  return [...addresses];
}

export function feedProblems(
  feed: string,
  product: string,
  version: string,
  platform: ReleasePlatform,
  prefix = '',
): string[] {
  const expected = artifactNames(product, version, platform).filter((name) => !name.endsWith('.blockmap'));
  const actual = feedAddresses(feed);
  const problems: string[] = [];
  if (!feed.split('\n').includes(`version: ${version}`)) problems.push('feed version does not match the cut');
  for (const name of expected) {
    if (!actual.includes(`${prefix}${name}`)) problems.push(`feed is missing ${name}`);
  }
  for (const address of actual) {
    if (!expected.some((name) => address === `${prefix}${name}`)) problems.push(`unexpected feed address: ${address}`);
  }
  return problems;
}
