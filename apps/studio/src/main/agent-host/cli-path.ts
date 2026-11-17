// Packaged, the SDK resolves its binary to an `app.asar` path that `existsSync` passes and `spawn` fails ENOTDIR; `asarUnpack` alone does not fix it (ONL-1802).
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

/** Mirrored from the SDK, which exports no resolver as of 0.3.220. */
function candidates(): string[] {
  const scope = '@anthropic-ai/claude-agent-sdk';
  const { platform, arch } = process;
  const exe = platform === 'win32' ? 'claude.exe' : 'claude';

  const packages =
    platform === 'android'
      ? [`${scope}-linux-${arch}-android`]
      : platform === 'linux'
        ? [`${scope}-linux-${arch}`, `${scope}-linux-${arch}-musl`]
        : [`${scope}-${platform}-${arch}`];

  return packages.map((pkg) => `${pkg}/${exe}`);
}

const sep = process.platform === 'win32' ? '\\' : '/';

const ASAR_SEGMENT = `app.asar${sep}`;

function unpackedTwin(path: string): string {
  if (path.includes(`app.asar.unpacked${sep}`)) return path;
  return path.replace(ASAR_SEGMENT, `app.asar.unpacked${sep}`);
}

let cached: string | null | undefined;

/** The SDK's entry comes first: `package.json` is not in its `exports`, and outside the packaged app that fallback is the only path left (ONL-2186). */
export function resolvePlatformBinary(requireFrom: NodeJS.Require = createRequire(import.meta.url)): string | undefined {
  const resolvers: NodeJS.Require[] = [requireFrom];
  for (const entry of ['@anthropic-ai/claude-agent-sdk', '@anthropic-ai/claude-agent-sdk/package.json']) {
    try {
      resolvers.push(createRequire(requireFrom.resolve(entry)));
    } catch {
      continue;
    }
  }
  for (const resolver of resolvers) {
    for (const candidate of candidates()) {
      try {
        return resolver.resolve(candidate);
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

/** `undefined` rather than a guess — a wrong path here reads as `cli_missing`. */
export function claudeExecutablePath(): string | undefined {
  if (cached !== undefined) return cached ?? undefined;

  const resolved = resolvePlatformBinary();
  if (resolved === undefined || !resolved.includes(ASAR_SEGMENT)) {
    cached = null;
    return undefined;
  }

  const unpacked = unpackedTwin(resolved);
  if (existsSync(unpacked)) {
    cached = unpacked;
    return unpacked;
  }

  cached = null;
  return undefined;
}

let cachedBinary: string | null | undefined;

/** Defined in packaged and unpackaged builds alike; `claudeExecutablePath()`'s `undefined` outside `app.asar` is a contract the SDK relies on (ONL-2186). */
export function claudeBinaryPath(): string | undefined {
  if (cachedBinary !== undefined) return cachedBinary ?? undefined;
  const resolved = resolvePlatformBinary();
  const onDisk = resolved === undefined ? undefined : unpackedTwin(resolved);
  cachedBinary = onDisk !== undefined && existsSync(onDisk) ? onDisk : null;
  return cachedBinary ?? undefined;
}
