import { t } from '@studio/i18n';

/** The lowest free number, never the count: a count re-mints a title a surviving sketch wears (ONL-2568). */
export function nextArtifactTitle(taken: readonly string[]): string {
  const held = new Set(taken.map((title) => title.trim()));
  for (let n = 1; ; n += 1) {
    const candidate = t('canvas.artifact.newName', { n: String(n) });
    if (!held.has(candidate)) return candidate;
  }
}
