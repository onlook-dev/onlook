import { isAbsolute, resolve } from 'node:path';
import { defineDomain } from '../state/store.js';

const location = defineDomain<{ folder?: string }>({
  name: 'projects-folder',
  version: 1,
  fallback: () => ({}),
});

export function chosenProjectsFolder(): string | undefined {
  const folder: unknown = location.read()?.folder;
  return typeof folder === 'string' && isAbsolute(folder) ? resolve(folder) : undefined;
}

export function chooseProjectsFolder(folder: string): void {
  if (!isAbsolute(folder)) throw new Error('Projects folder must be absolute');
  const previous = location.read();
  try { location.write({ folder: resolve(folder) }); }
  catch (error) {
    try { location.write(previous); } catch {}
    throw error;
  }
}

export function resetProjectsFolderForTesting(): void {
  location.reset();
}
