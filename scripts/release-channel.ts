export const CHANNELS = ['alpha', 'beta', 'latest'] as const;
export type ReleaseChannel = (typeof CHANNELS)[number];

function parseVersion(version: string): { core: bigint[]; channel: ReleaseChannel; sequence: bigint } {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(alpha|beta)\.(0|[1-9]\d*))?$/.exec(version);
  if (!match || match[0] !== version) throw new Error(`Invalid release version: ${version}`);
  return {
    core: [BigInt(match[1]!), BigInt(match[2]!), BigInt(match[3]!)],
    channel: (match[4] ?? 'latest') as ReleaseChannel,
    sequence: BigInt(match[5] ?? '0'),
  };
}

export function validateVersion(version: string, channel?: ReleaseChannel): void {
  const parsed = parseVersion(version);
  if (channel !== undefined && parsed.channel !== channel) throw new Error(`Version ${version} does not match channel ${channel}`);
}

export function releaseOptions(args: readonly string[], allowVersionOnly = false): { channel?: ReleaseChannel; version?: string } {
  function value(flag: string): string | undefined {
    const index = args.indexOf(flag);
    if (index < 0) return undefined;
    if (args.lastIndexOf(flag) !== index) throw new Error(`${flag} must be given once`);
    const next = args[index + 1];
    if (!next || next.startsWith('-')) throw new Error(`${flag} needs a value`);
    return next;
  }
  const requested = value('--channel');
  if (requested !== undefined && !CHANNELS.includes(requested as ReleaseChannel)) throw new Error(`--channel must be one of: ${CHANNELS.join(', ')}`);
  const channel = requested as ReleaseChannel | undefined;
  const version = value('--version');
  if (version !== undefined) {
    if (channel === undefined && !allowVersionOnly) throw new Error('--version requires --channel');
    validateVersion(version, channel);
  }
  return { ...(channel === undefined ? {} : { channel }), ...(version === undefined ? {} : { version }) };
}

export function builderReleaseArgs(channel: ReleaseChannel | undefined, version?: string, officialBuild = true): string[] {
  if (version !== undefined) validateVersion(version, channel);
  return [...(officialBuild ? [`-c.publish.channel=${channel ?? 'latest'}`] : []), ...(version === undefined ? [] : [`-c.extraMetadata.version=${version}`])];
}
