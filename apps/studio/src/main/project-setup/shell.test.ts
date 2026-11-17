import { describe, expect, it } from 'bun:test';
import { gitBashShell, setupShell } from './shell.js';

const ROOT = 'C:\\Program Files\\Git';

describe('the shell a project setup runs in', () => {
  it.each([
    ['cmd\\git.exe', 'bin\\sh.exe'],
    ['bin\\git.exe', 'bin\\sh.exe'],
    ['mingw64\\bin\\git.exe', 'bin\\sh.exe'],
    ['cmd\\git.exe', 'usr\\bin\\sh.exe'],
  ])('finds Git for Windows sh.exe from %s when the install has %s', (git, sh) => {
    const present = `${ROOT}\\${sh}`;
    expect(gitBashShell(`${ROOT}\\${git}`, (path) => path === present)).toBe(present);
  });

  it('finds none when no sh.exe sits in the git install', () => {
    expect(gitBashShell(`${ROOT}\\cmd\\git.exe`, () => false)).toBeUndefined();
  });

  it('stays /bin/sh off Windows', () => {
    expect(setupShell('/', {}, 'darwin')).toBe('/bin/sh');
  });
});
