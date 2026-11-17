import { afterEach, describe, expect, it } from 'bun:test';
import { installCanvasFileSeat } from './dropSeat.js';
import { PROJECT_IMAGE_DRAG_TYPE } from './projectFileDrag.js';

const originalElement = Object.getOwnPropertyDescriptor(globalThis, 'Element');
afterEach(() => {
  if (originalElement === undefined) Reflect.deleteProperty(globalThis, 'Element');
  else Object.defineProperty(globalThis, 'Element', originalElement);
});

describe('project image drops share the canvas file seat', () => {
  it('claims the canvas during protected dragover, then passes only the project path at drop', () => {
    class Target {
      closest() { return {}; }
    }
    Object.defineProperty(globalThis, 'Element', { value: Target, configurable: true });
    const listeners = new Map<string, (event: unknown) => void>();
    const doc = { addEventListener: (type: string, callback: (event: unknown) => void) => listeners.set(type, callback) };
    const win = { addEventListener: () => undefined, innerWidth: 1280, innerHeight: 800 };
    const claims: string[] = [];
    const drops: unknown[] = [];
    let ended = 0;
    const cleanup = installCanvasFileSeat(doc as unknown as Document, win as unknown as Window, {
      onDrag: (over) => claims.push(over),
      onDragEnd: () => { ended += 1; },
      onDrop: () => { throw new Error('project drag must not become an empty OS-file drop'); },
      onProjectImageDrop: (image, pointer) => drops.push({ image, pointer }),
    });
    const transfer = {
      types: [PROJECT_IMAGE_DRAG_TYPE],
      items: [],
      dropEffect: 'none',
      getData: (): string => { throw new Error('payload is protected before drop'); },
    };
    let prevented = 0;
    let stopped = 0;
    const event = { target: new Target(), dataTransfer: transfer, clientX: 320, clientY: 240, preventDefault: () => { prevented += 1; }, stopPropagation: () => { stopped += 1; } };
    listeners.get('dragover')!(event);
    expect(claims).toEqual(['canvas']);
    expect(transfer.dropEffect).toBe('copy');
    transfer.getData = () => JSON.stringify({ path: 'public/logo.png', workspacePath: '/project' });
    listeners.get('drop')!(event);
    expect(drops).toEqual([{ image: { path: 'public/logo.png', workspacePath: '/project' }, pointer: { x: 320, y: 240 } }]);
    expect(prevented).toBe(2);
    expect(stopped).toBe(2);
    expect(ended).toBe(1);
    cleanup();
  });
});
