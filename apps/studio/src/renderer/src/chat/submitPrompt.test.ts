import { describe, expect, it } from 'bun:test';
import type { AgentCommandAcceptance, ImageRef, PromptAttachment } from '@studio/events';
import type { ElementSelection, SelectedNodeFacts } from '../canvas/selection.js';
import {
  assemblePrompt,
  submitPrompt,
  type PromptFrameContext,
  type PromptSubmitResult,
} from './submitPrompt.js';

const IMAGE: ImageRef = { id: 'img-1', mediaType: 'image/png' };

function selection(id: string, frameNodeId: string, stale = false): ElementSelection {
  return {
    evidence: {
      kind: 'element',
      id,
      tag: 'h1',
      domPath: 'body > main:nth-of-type(1) > h1:nth-of-type(1)',
      outerHtmlSnippet: `<h1>${id}</h1>`,
      textContent: id,
      classes: ['hero'],
      frameUrl: 'http://localhost:3000/',
    },
    frameNodeId,
    stale,
  };
}

const NAMES: Record<string, string> = { n1: 'Home', n2: 'Pricing' };

function frames(selectedFrameIds: readonly string[]): PromptFrameContext {
  return { selectedFrameIds, frameName: (id) => NAMES[id] };
}

const NO_FRAMES = frames([]);

interface Recorder {
  send: (text: string, attachments: PromptAttachment[], context: string) => Promise<AgentCommandAcceptance>;
  calls: { text: string; attachments: PromptAttachment[]; context: string }[];
}

function recorder(answer: () => Promise<AgentCommandAcceptance>): Recorder {
  const calls: Recorder['calls'] = [];
  return {
    calls,
    send: (text, attachments, context) => {
      calls.push({ text, attachments, context });
      return answer();
    },
  };
}

const accepts = (): Promise<AgentCommandAcceptance> => Promise.resolve({ accepted: true });

describe('assemblePrompt', () => {
  it('keeps the exact artifact identity and unadorned title in an artifact-only send', () => {
    const artifact = { kind: 'artifact' as const, artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Pricing', pagePath: 'pages/cart.html' };
    const assembled = assemblePrompt({ text: '', images: [], elementSelections: [], frames: NO_FRAMES, artifacts: [artifact] });
    expect(assembled?.attachments).toEqual([artifact]);
    expect(assembled?.artifacts).toEqual([artifact]);
  });

  it('sends the trimmed text with an empty attachment list when nothing is attached', () => {
    const assembled = assemblePrompt({
      text: '  make the hero cobalt  ',
      images: [],
      elementSelections: [],
      frames: NO_FRAMES,
    });

    expect(assembled).not.toBeNull();
    expect(assembled?.text).toBe('make the hero cobalt');
    expect(assembled?.attachments).toEqual([]);
    expect(assembled?.context).toBe('');
  });

  it('treats evidence with no text as a complete request', () => {
    const picked = selection('e-1', 'n1');
    const assembled = assemblePrompt({
      text: '   ',
      images: [],
      elementSelections: [picked],
      frames: frames(['n1']),
    });

    expect(assembled).not.toBeNull();
    expect(assembled?.text).toBe('');
    expect(assembled?.evidence.map((item) => item.id)).toEqual(['e-1']);
  });

  it('treats an image with no text as a complete request', () => {
    const assembled = assemblePrompt({
      text: '',
      images: [IMAGE],
      elementSelections: [],
      frames: NO_FRAMES,
    });

    expect(assembled?.images).toEqual([IMAGE]);
  });

  it('refuses neither text nor any attachment', () => {
    expect(
      assemblePrompt({ text: '  ', images: [], elementSelections: [], frames: frames(['n1']) }),
    ).toBeNull();
  });

  it('carries the frame identity composed from the element selections and the selected frames', () => {
    const assembled = assemblePrompt({
      text: 'hi',
      images: [],
      elementSelections: [selection('e-1', 'n1')],
      frames: frames(['n1', 'n2']),
    });

    expect(assembled?.context).toBe(
      'The selected elements were picked in canvas frame "Home" (id n1).\n' +
        'The user currently has these canvas frames selected: "Home" (id n1) (where the selected elements were picked), "Pricing" (id n2).',
    );
  });

  it('carries a sender’s hidden context after the frame identity, never in the text', () => {
    const assembled = assemblePrompt({
      text: 'My app stopped.',
      context: 'Studio saw the server stop.',
      images: [],
      elementSelections: [],
      frames: frames(['n1']),
    });

    expect(assembled?.text).toBe('My app stopped.');
    expect(assembled?.context).toBe('The user currently has canvas frame "Home" (id n1) selected.\n\nStudio saw the server stop.');
  });

  it('sends no context of its own when there is no frame identity', () => {
    const assembled = assemblePrompt({ text: 'hi', context: 'hidden', images: [], elementSelections: [], frames: NO_FRAMES });
    expect(assembled?.context).toBe('hidden');
  });
});

describe('submitPrompt', () => {
  it('produces the same command the composer produced before the lift', async () => {
    const send = recorder(accepts);
    const result = await submitPrompt(
      {
        text: '  make the hero cobalt  ',
        images: [IMAGE],
        elementSelections: [selection('e-1', 'n1'), selection('e-2', 'n1', true)],
        frames: frames(['n1', 'n2']),
      },
      { send: send.send, inFlight: { current: false } },
    );

    expect(send.calls).toHaveLength(1);
    expect(send.calls[0]?.text).toBe('make the hero cobalt');
    expect(send.calls[0]?.attachments).toEqual([
      { id: 'img-1', mediaType: 'image/png' },
      {
        kind: 'element',
        id: 'e-1',
        tag: 'h1',
        domPath: 'body > main:nth-of-type(1) > h1:nth-of-type(1)',
        outerHtmlSnippet: '<h1>e-1</h1>',
        textContent: 'e-1',
        classes: ['hero'],
        frameUrl: 'http://localhost:3000/',
        stale: false,
      },
      {
        kind: 'element',
        id: 'e-2',
        tag: 'h1',
        domPath: 'body > main:nth-of-type(1) > h1:nth-of-type(1)',
        outerHtmlSnippet: '<h1>e-2</h1>',
        textContent: 'e-2',
        classes: ['hero'],
        frameUrl: 'http://localhost:3000/',
        stale: true,
      },
      { kind: 'frame', name: 'Home' },
      { kind: 'frame', name: 'Pricing' },
    ]);
    expect(send.calls[0]?.context).toBe(
      'The selected elements were picked in canvas frame "Home" (id n1).\n' +
        'The user currently has these canvas frames selected: "Home" (id n1) (where the selected elements were picked), "Pricing" (id n2).',
    );
    expect(result.outcome).toBe('accepted');
    if (result.outcome !== 'accepted') return;
    expect(result.submitted.images.map((ref) => ref.id)).toEqual(['img-1']);
    expect(result.submitted.evidence.map((item) => item.id)).toEqual(['e-1', 'e-2']);
  });

  it('refuses an empty request before it reaches the session', async () => {
    const send = recorder(accepts);
    const result = await submitPrompt(
      { text: '', images: [], elementSelections: [], frames: NO_FRAMES },
      { send: send.send, inFlight: { current: false } },
    );

    expect(result).toEqual({ outcome: 'empty' });
    expect(send.calls).toHaveLength(0);
  });

  it('ignores a second submit while one is in flight', async () => {
    let release = (): void => undefined;
    const send = recorder(
      () => new Promise<AgentCommandAcceptance>((resolve) => {
        release = () => resolve({ accepted: true });
      }),
    );
    const inFlight = { current: false };
    const input = { text: 'one', images: [], elementSelections: [], frames: NO_FRAMES };

    const first = submitPrompt(input, { send: send.send, inFlight });
    const second = await submitPrompt(input, { send: send.send, inFlight });

    expect(second).toEqual({ outcome: 'in-flight' });
    expect(send.calls).toHaveLength(1);

    release();
    expect((await first).outcome).toBe('accepted');
    expect(inFlight.current).toBe(false);
  });

  it('reports a rejected send and hands back nothing to clear', async () => {
    const send = recorder(() => Promise.resolve({ accepted: false }));
    const result: PromptSubmitResult = await submitPrompt(
      { text: 'one', images: [IMAGE], elementSelections: [selection('e-1', 'n1')], frames: frames(['n1']) },
      { send: send.send, inFlight: { current: false } },
    );

    expect(result).toEqual({ outcome: 'rejected' });
  });

  it('reports a throwing send and hands back nothing to clear', async () => {
    const send = recorder(() => Promise.reject(new Error('ipc gone')));
    const inFlight = { current: false };
    const result = await submitPrompt(
      { text: 'one', images: [IMAGE], elementSelections: [selection('e-1', 'n1')], frames: frames(['n1']) },
      { send: send.send, inFlight },
    );

    expect(result).toEqual({ outcome: 'failed' });
    expect(inFlight.current).toBe(false);
  });

  it('lets a caller name its own frame instead of the composer selection', async () => {
    const picked = [selection('e-1', 'n1')];
    const composerSend = recorder(accepts);
    await submitPrompt(
      { text: 'hi', images: [], elementSelections: picked, frames: frames(['n2']) },
      { send: composerSend.send, inFlight: { current: false } },
    );
    expect(composerSend.calls[0]?.context).toContain(
      'not the frame the selected elements were picked in',
    );

    const callerSend = recorder(accepts);
    await submitPrompt(
      { text: 'hi', images: [], elementSelections: picked, frames: frames(['n1']) },
      { send: callerSend.send, inFlight: { current: false } },
    );

    expect(callerSend.calls[0]?.context).toBe(
      'The selected elements were picked in canvas frame "Home" (id n1).\n' +
        'The user currently has canvas frame "Home" (id n1) selected.',
    );
    expect(callerSend.calls[0]?.context).not.toContain('not the frame');
    expect(callerSend.calls[0]?.attachments).toEqual([
      {
        kind: 'element',
        id: 'e-1',
        tag: 'h1',
        domPath: 'body > main:nth-of-type(1) > h1:nth-of-type(1)',
        outerHtmlSnippet: '<h1>e-1</h1>',
        textContent: 'e-1',
        classes: ['hero'],
        frameUrl: 'http://localhost:3000/',
        stale: false,
      },
      { kind: 'frame', name: 'Home' },
    ]);
  });
});

describe('a selected canvas object reaches the prompt by its kind (ONL-2486)', () => {
  // A real text node's stored name is always blank; only its resolved label names it (ONL-2486).
  const objects: Record<string, SelectedNodeFacts> = {
    n1: { kind: 'browser', name: 'Home', label: 'Home' },
    t1: { kind: 'text', name: '', label: 'Variants', text: 'Variants' },
    i1: { kind: 'image', name: 'mockup.png', label: 'mockup.png', imageId: 'blob-7' },
  };
  const canvas = (selectedFrameIds: readonly string[]): PromptFrameContext => ({
    selectedFrameIds,
    frameName: (id) => objects[id]?.name,
    nodeAt: (id) => objects[id],
  });
  const stored: ImageRef = { id: 'blob-7', mediaType: 'image/jpeg' };

  it('carries a selected picture as an image reference resolved from the store', async () => {
    const send = recorder(accepts);
    const asked: string[] = [];
    await submitPrompt(
      { text: 'match this', images: [], elementSelections: [], frames: canvas(['i1']) },
      {
        send: send.send,
        inFlight: { current: false },
        canvasImage: async (imageId) => {
          asked.push(imageId);
          return stored;
        },
      },
    );

    expect(asked).toEqual(['blob-7']);
    expect(send.calls[0]?.attachments).toEqual([stored]);
  });

  it('asks for nothing, and carries nothing, while that picture is unselected', async () => {
    const send = recorder(accepts);
    const asked: string[] = [];
    await submitPrompt(
      { text: 'match this', images: [], elementSelections: [], frames: canvas([]) },
      {
        send: send.send,
        inFlight: { current: false },
        canvasImage: async (imageId) => {
          asked.push(imageId);
          return stored;
        },
      },
    );

    expect(asked).toEqual([]);
    expect(send.calls[0]?.attachments).toEqual([]);
  });

  it('chips a selected text object like a frame, and names its kind in the context', () => {
    const assembled = assemblePrompt({
      text: 'shorten it',
      images: [],
      elementSelections: [],
      frames: canvas(['t1']),
    });

    expect(assembled?.attachments).toEqual([{ kind: 'frame', name: 'Variants', object: 'text' }]);
    expect(assembled?.context).toBe(
      'The user currently has the canvas text object "Variants" (id t1) selected.',
    );
  });

  it('never chips a picture as a frame: the reference carries it', () => {
    const assembled = assemblePrompt({
      text: 'match this',
      images: [],
      elementSelections: [],
      frames: canvas(['i1']),
      canvasImages: [stored],
    });

    expect(assembled?.attachments).toEqual([stored]);
    expect(assembled?.context).toBe(
      'The user currently has the canvas image "mockup.png" (id i1) selected.',
    );
  });
});
