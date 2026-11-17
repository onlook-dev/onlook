import { describe, expect, it } from 'bun:test';
import { defaultTextBox, type CanvasNode } from '@studio/events';
import { mintedDuplicate } from './nodes.js';

const AT = { x: 40, y: 80 };

function sketch(): CanvasNode {
  return {
    id: 'n',
    pageId: 'pg_main',
    kind: 'artifact',
    name: '',
    x: 0,
    y: 0,
    width: 480,
    height: 640,
    order: 0,
    content: { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Pricing' },
  };
}

function note(): CanvasNode {
  return {
    id: 'n',
    pageId: 'pg_main',
    kind: 'text',
    name: 'Note',
    x: 0,
    y: 0,
    ...defaultTextBox('medium'),
    order: 0,
    content: { text: 'a note', size: 'medium' },
  };
}

describe('what duplicating mints (ONL-2568)', () => {
  it('requests an artifact duplicate that keeps the sketch’s identity, a second placement and not a copy', () => {
    const minted = mintedDuplicate(sketch(), AT, 3);

    expect(minted?.op.type).toBe('duplicate');
    expect(minted?.id).not.toBe('n');
    if (minted?.op.type !== 'duplicate' || minted.op.node.kind !== 'artifact') throw new Error('Expected an artifact duplicate');
    expect(minted.op.node.content.artifactId).toBe('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
  });

  it('still mints every other kind', () => {
    const minted = mintedDuplicate(note(), AT, 3);

    expect(minted?.op.type).toBe('duplicate');
    expect(minted?.id).not.toBe('n');
  });
});
