import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'bun:test';
import { t } from '@studio/i18n';
import { buildIdentity } from './build-kind.js';

const startup = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const menu = readFileSync(new URL('./menu/index.ts', import.meta.url), 'utf8');

describe('the Safe Storage application name', () => {
  it('sets the packaged namespace before ready without changing the development namespace', () => {
    const naming = "app.setName(OFFICIAL_BUILD ? (app.isPackaged ? identity.appId : 'Onlook Development') : identity.productName)";
    expect(startup).toContain(naming);
    expect(startup.indexOf(naming)).toBeLessThan(startup.indexOf('app.whenReady()'));
  });

  it('keeps user data pinned independently of the Safe Storage namespace', () => {
    expect(startup).toContain("join(app.getPath('appData'), identity.dataFolder)");
    expect(buildIdentity(true).dataFolder).toBe('Onlook Studio');
    expect(buildIdentity(false).dataFolder).toBe('Onlook Studio Source');
    expect(startup).toContain("app.setPath('userData', pinnedUserData)");
  });

  it('names the tabbed native window Onlook independently of the Safe Storage namespace', () => {
    const window = readFileSync(new URL('./tabs/window.ts', import.meta.url), 'utf8');
    const options = window.match(/new BaseWindow\(\{([\s\S]*?)\n    \}\)/)?.[1];
    expect(options).toBeDefined();
    expect(options).toContain("title: t('app.name')");
    expect(t('app.name')).toBe('Onlook');
  });

  it('keeps the application menu and native role labels named Onlook', () => {
    expect(menu).not.toMatch(/label:\s*app\.name/);
    expect(menu).toContain("label: t('app.name')");
    expect(menu).toContain("{ role: 'about', label: t('menu.about') }");
    expect(menu).toContain("{ role: 'hide' as const, label: t('menu.hide') }");
    expect(menu).toContain("{ role: 'quit', label: t('menu.quit') }");
    expect(t('app.name')).toBe('Onlook');
    expect(t('menu.quit')).toBe('Quit Onlook');
    expect(t('menu.about')).toBe('About Onlook');
    expect(t('menu.hide')).toBe('Hide Onlook');
  });

  it('keeps the About panel named Onlook rather than the encryption namespace', () => {
    expect(startup).toContain("applicationName: t('app.name')");
    expect(buildIdentity(true).productName).toBe('Onlook');
    expect(buildIdentity(false).productName).toBe('Onlook Source');
    expect(startup).not.toContain('app.getName()');
  });

  it.each(['index.ts', 'reset/index.ts', 'workspace/remove-project.ts', 'tabs/close-dialog.ts', 'updater/location.ts'])('%s pins native dialog titles to Onlook instead of the storage name', (path) => {
    const source = readFileSync(new URL(`./${path}`, import.meta.url), 'utf8');
    const dialogs = [...source.matchAll(/(?:showMessageBoxSync|showMessageBox|show)\(\{([\s\S]*?)\n\s*\}\)/g)];
    expect(dialogs.length).toBeGreaterThan(0);
    for (const dialog of dialogs) expect(dialog[1]).toContain("title: t('app.name')");
  });
});
