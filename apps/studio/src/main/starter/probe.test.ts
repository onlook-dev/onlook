import { describe, expect, it } from 'bun:test';
import { EventEmitter } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import { checkHelperProcess } from './probe.js';

describe('helper probe', () => {
  it('reports a definite start failure when the real fork mechanism refuses to launch', async () => {
    await expect(checkHelperProcess(() => { throw new Error('launch refused'); })).rejects.toMatchObject({ failureCause: 'starter_exited' });
  });
  it('uses a real module handshake and kills and removes its scratch child', async () => {
    const child = new EventEmitter() as EventEmitter & { kill(): boolean };
    let killed = false;
    let modulePath = '';
    child.kill = () => { killed = true; queueMicrotask(() => child.emit('exit', 0)); return true; };
    await checkHelperProcess((path) => {
      modulePath = path;
      expect(readFileSync(path, 'utf8')).toContain('process.parentPort.postMessage');
      queueMicrotask(() => child.emit('message', 'onlook-ready'));
      return child;
    });
    expect(killed).toBe(true);
    expect(existsSync(modulePath)).toBe(false);
  });

  it('does not pass a child that exits without its handshake', async () => {
    const child = Object.assign(new EventEmitter(), { kill: () => true });
    await expect(checkHelperProcess(() => {
      queueMicrotask(() => child.emit('exit', 1));
      return child;
    })).rejects.toMatchObject({ failureCause: 'starter_exited' });
  });

  it('bounds a hung probe and kills it without calling it a proven failure', async () => {
    let killed = false;
    const child = Object.assign(new EventEmitter(), { kill: () => { killed = true; return true; } });
    await expect(checkHelperProcess(() => child, 1)).rejects.toThrow('Helper did not start');
    expect(killed).toBe(true);
  });
});
