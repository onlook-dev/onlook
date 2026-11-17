import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { app } from 'electron';
import type { ClaudeBrowser } from '@studio/events';
import { log } from '../log/index.js';
import { openExternalForClaude } from './env.js';
import { spawnLoginChild, startClaudeLogin, type ClaudeLoginHandle, type LoginChild, type LoginSpawn, type StartClaudeLoginOptions } from './login.js';
import { isMac } from '../env/platform.js';
import { APP_ENV, runChild } from '../env/child.js';
import { devSwitches } from '../env/dev-switches.js';

interface ClaudeBrowserApplicationInfo {
  CFBundleIdentifier?: string;
  CFBundleDisplayName?: string;
  CFBundleName?: string;
  CFBundleURLTypes?: Array<{ CFBundleURLSchemes?: string[] }>;
}

interface InstalledBrowser {
  browser: ClaudeBrowser;
  path: string;
  aliases: string[];
}

export interface ClaudeBrowserDiscoveryOptions {
  platform?: NodeJS.Platform;
  applicationPaths?: () => string[] | Promise<string[]>;
  defaultApplicationName?: () => string;
  readApplication?: (path: string) => ClaudeBrowserApplicationInfo | Promise<ClaudeBrowserApplicationInfo>;
  openApplication?: (path: string, url: string) => Promise<void>;
}

export interface ClaudeBrowsers {
  list(): ClaudeBrowser[];
  load(): Promise<ClaudeBrowser[]>;
  login(browserId: string, options: StartClaudeLoginOptions): Promise<ClaudeLoginHandle>;
  open(browserId: string, url: string): Promise<void>;
}

export type ClaudeBrowserLogin = ClaudeBrowsers['login'];

export class ClaudeBrowserPreparationError extends Error {
  constructor() {
    super('the selected browser could not be prepared');
    this.name = 'ClaudeBrowserPreparationError';
  }
}

const logger = log('claude');

const APPLICATIONS_FOR_HTTPS = `
ObjC.import('AppKit');
var urls = $.NSWorkspace.sharedWorkspace.URLsForApplicationsToOpenURL($.NSURL.URLWithString('https://example.invalid'));
var paths = [];
for (var index = 0; index < urls.count; index++) {
  paths.push(ObjC.unwrap(urls.objectAtIndex(index).path));
}
JSON.stringify(paths);
`;

function commandOutput(command: string, args: string[], timeout: number, maxBuffer: number): Promise<string> {
  return new Promise((resolve, reject) => {
    runChild(command, args, { env: APP_ENV, encoding: 'utf8', timeout, maxBuffer }, (error, stdout) => {
      if (error) reject(new Error('browser application discovery failed'));
      else resolve(stdout);
    });
  });
}

async function applicationPaths(): Promise<string[]> {
  const paths: unknown = JSON.parse(await commandOutput('/usr/bin/osascript', ['-l', 'JavaScript', '-e', APPLICATIONS_FOR_HTTPS], 3_000, 1024 * 1024));
  if (!Array.isArray(paths)) return [];
  return paths.filter((path): path is string => typeof path === 'string' && path.startsWith('/') && path.endsWith('.app'));
}

async function readApplication(path: string): Promise<ClaudeBrowserApplicationInfo> {
  return JSON.parse(await commandOutput('/usr/bin/plutil', ['-convert', 'json', '-o', '-', join(path, 'Contents', 'Info.plist')], 1_000, 256 * 1024));
}

async function browserAt(
  path: string,
  read: (path: string) => ClaudeBrowserApplicationInfo | Promise<ClaudeBrowserApplicationInfo>,
): Promise<InstalledBrowser | undefined> {
  try {
    const canonical = await realpath(path);
    const info = await read(canonical);
    if (typeof info.CFBundleIdentifier !== 'string' || info.CFBundleIdentifier.length === 0) return undefined;
    const schemes = info.CFBundleURLTypes?.flatMap((type) => type.CFBundleURLSchemes ?? []);
    if (!schemes?.includes('http') || !schemes.includes('https')) return undefined;
    const names = [info.CFBundleDisplayName, info.CFBundleName, basename(path, '.app')]
      .filter((name): name is string => typeof name === 'string' && name.length > 0);
    const id = createHash('sha256').update(`${info.CFBundleIdentifier}\0${canonical}`).digest('hex');
    return { browser: { id, name: names[0]!, isDefault: false }, path: canonical, aliases: names };
  } catch {
    return undefined;
  }
}

function openApplication(path: string, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    runChild('/usr/bin/open', ['-a', path, url], { env: APP_ENV, timeout: 10_000 }, (error) => {
      if (error) reject(new Error('the selected browser could not open the sign-in page'));
      else resolve();
    });
  });
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function loginInBrowser(
  installed: InstalledBrowser,
  options: StartClaudeLoginOptions,
  open: (path: string, url: string) => Promise<void>,
): Promise<ClaudeLoginHandle> {
  if (installed.browser.isDefault) return startClaudeLogin(options);
  let directory: string;
  try {
    directory = mkdtempSync(join(tmpdir(), 'onlook-claude-browser-'));
  } catch {
    throw new ClaudeBrowserPreparationError();
  }
  const launcher = join(directory, 'open-browser');
  const cleanup = (): void => {
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch {
      logger.warn('could not remove browser login launcher');
    }
  };
  let child: LoginChild | undefined;
  const spawnChild: LoginSpawn = options.spawn ?? spawnLoginChild;
  try {
    chmodSync(directory, 0o700);
    const script = devSwitches.claudeOpen === '0'
      ? '#!/bin/sh\nexit 0\n'
      : `#!/bin/sh\nexec /usr/bin/open -a ${shellQuote(installed.path)} "$@"\n`;
    writeFileSync(launcher, script, { mode: 0o700 });
    chmodSync(launcher, 0o700);
  } catch {
    cleanup();
    throw new ClaudeBrowserPreparationError();
  }
  try {
    return await startClaudeLogin({
      ...options,
      env: { ...options.env, BROWSER: launcher },
      openExternal: openExternalForClaude((url) => open(installed.path, url)),
      spawn: (bin, args, config) => {
        child = spawnChild(bin, args, config);
        child.on('exit', cleanup);
        child.on('error', cleanup);
        return child;
      },
    });
  } catch (error) {
    if (child === undefined) cleanup();
    throw error;
  }
}

export function createClaudeBrowsers(options: ClaudeBrowserDiscoveryOptions = {}): ClaudeBrowsers {
  let installed = new Map<string, InstalledBrowser>();
  let loading: Promise<ClaudeBrowser[]> | undefined;
  const read = options.readApplication ?? readApplication;
  const list = (): ClaudeBrowser[] => [...installed.values()].map(({ browser }) => ({ ...browser }));
  const discover = async (): Promise<ClaudeBrowser[]> => {
    if (!isMac(options.platform)) return [];
    const defaultName = (options.defaultApplicationName ?? (() => app.getApplicationNameForProtocol('https:')))();
    if (!defaultName) return [];
    const discovered = new Map<string, InstalledBrowser>();
    const paths = await (options.applicationPaths ?? applicationPaths)();
    for (const found of await Promise.all(paths.map((path) => browserAt(path, read)))) {
      if (found && !discovered.has(found.browser.id)) discovered.set(found.browser.id, found);
    }
    const defaultBrowser = [...discovered.values()].find(({ aliases }) => aliases.includes(defaultName));
    if (defaultBrowser === undefined) return [];
    defaultBrowser.browser.isDefault = true;
    const sorted = [...discovered.values()].sort((left, right) =>
      Number(right.browser.isDefault) - Number(left.browser.isDefault) || left.browser.name.localeCompare(right.browser.name));
    installed = new Map(sorted.map((entry) => [entry.browser.id, entry]));
    return list();
  };
  const load = (): Promise<ClaudeBrowser[]> => loading ??= discover().catch(() => {
    loading = undefined;
    return [];
  });
  return {
    list,
    load,
    login: async (browserId, loginOptions) => {
      await load();
      const selected = installed.get(browserId);
      if (selected === undefined || (await browserAt(selected.path, read))?.browser.id !== browserId) {
        installed.delete(browserId);
        throw new ClaudeBrowserPreparationError();
      }
      return loginInBrowser(selected, loginOptions, options.openApplication ?? openApplication);
    },
    open: async (browserId, url) => {
      await load();
      const selected = installed.get(browserId);
      if (selected === undefined) throw new ClaudeBrowserPreparationError();
      await (options.openApplication ?? openApplication)(selected.path, url);
    },
  };
}
