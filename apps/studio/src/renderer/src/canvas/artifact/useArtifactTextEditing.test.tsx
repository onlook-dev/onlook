import { takeComplaints } from '../../testing/dom.js';
import { expect, it } from 'bun:test';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type { WebviewTag } from 'electron';
import type { ArtifactTextPrepareResult, ArtifactTextTarget } from '@studio/events';
import { resetCanvasStoreForTests, useCanvasStore } from '../store.js';
import { useArtifactTextEditing } from './useArtifactTextEditing.js';

const target: ArtifactTextTarget = {
  token: 'prepared', text: 'Hello', rect: { x: 20, y: 40, width: 260, height: 36 },
  style: { fontFamily: 'Arial', fontSize: '28px', fontWeight: '600', lineHeight: '36px', letterSpacing: 'normal', textAlign: 'left', color: 'black', backgroundColor: 'white' },
};

it('rejects delayed preparation after navigation, Interact or guest replacement and never resurrects a closed editor', async () => {
  const previous = window.studio;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let finish: ((value: ArtifactTextPrepareResult) => void) | undefined;
  window.studio = { ...previous, artifactTextPrepare: () => new Promise((resolve) => { finish = resolve; }) };
  const guest = { current: { getWebContentsId: () => 42 } as WebviewTag };
  let current: ReturnType<typeof useArtifactTextEditing> | undefined;
  function Harness({ revision }: { revision: string }): React.JSX.Element {
    current = useArtifactTextEditing('node', guest, 'studio-artifact://artifact/pages/index.html', 'updated', revision);
    return <div />;
  }
  const render = async (revision: string) => { await React.act(async () => { root.render(<Harness revision={revision} />); }); };
  const begin = async () => { await React.act(async () => { current!.begin({ x: 20, y: 40 }); }); };
  const resolve = async () => { await React.act(async () => { finish!({ outcome: 'editable', target }); }); };
  try {
    useCanvasStore.setState({ mode: 'design', tool: 'select', selectedNodeIds: ['node'] });
    await render('one');
    await begin();
    expect(current!.preparing).toBe(true);
    await render('two');
    await resolve();
    expect(current!.editing).toBeNull();
    await begin();
    await React.act(async () => { useCanvasStore.setState({ mode: 'interact' }); });
    await resolve();
    expect(current!.editing).toBeNull();
    await React.act(async () => { useCanvasStore.setState({ mode: 'design' }); });
    await begin();
    guest.current = { getWebContentsId: () => 43 } as WebviewTag;
    await resolve();
    expect(current!.editing).toBeNull();
    await begin();
    await resolve();
    expect(current!.editing?.target.token).toBe('prepared');
    await React.act(async () => { useCanvasStore.setState({ mode: 'interact' }); });
    expect(current!.stale).toBe(true);
    await React.act(async () => { useCanvasStore.setState({ mode: 'design' }); });
    expect(current!.stale).toBe(true);
    await render('three');
    expect(current!.stale).toBe(true);
    expect(current!.editing?.target.text).toBe('Hello');
    await React.act(async () => { current!.close(); });
    expect(current!.editing).toBeNull();
    await begin();
    await React.act(async () => { current!.close(); });
    await resolve();
    expect(current!.editing).toBeNull();
  } finally {
    await React.act(async () => { root.unmount(); resetCanvasStoreForTests(); });
    window.studio = previous;
    container.remove();
  }
  expect(takeComplaints()).toEqual([]);
});
