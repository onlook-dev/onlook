import { describe, expect, it } from 'bun:test';
import type { PromptSubmitResult } from './submitPrompt.js';
import {
  isChatSubmitRegistered,
  registerChatSubmit,
  submitChatPrompt,
  type ChatSubmitRequest,
} from './submitRegistry.js';

function stub(): {
  submit: (request: ChatSubmitRequest) => Promise<PromptSubmitResult>;
  requests: ChatSubmitRequest[];
} {
  const requests: ChatSubmitRequest[] = [];
  return {
    requests,
    submit: (request) => {
      requests.push(request);
      return Promise.resolve({
        outcome: 'accepted',
        submitted: { text: request.text, attachments: [], context: '', images: [], evidence: [] },
        held: false,
      });
    },
  };
}

describe('the chat submit registry', () => {
  it('refuses by name when nothing is registered', async () => {
    expect(await submitChatPrompt({ text: 'hi' })).toEqual({ outcome: 'unavailable' });
    expect(isChatSubmitRegistered()).toBe(false);
  });

  it('reaches the live submit once the chat region registers', async () => {
    const chat = stub();
    const unregister = registerChatSubmit({ submit: chat.submit });

    const result = await submitChatPrompt({ text: 'make the hero cobalt' });

    expect(result.outcome).toBe('accepted');
    expect(chat.requests).toEqual([{ text: 'make the hero cobalt' }]);
    unregister();
  });

  it('passes a caller-supplied frame context through untouched', async () => {
    const chat = stub();
    const unregister = registerChatSubmit({ submit: chat.submit });
    const frames = { selectedFrameIds: ['n7'], frameName: () => 'Checkout' };

    await submitChatPrompt({ text: 'hi', frames });

    expect(chat.requests[0]?.frames).toBe(frames);
    unregister();
  });

  it('passes a caller-supplied image set through untouched (ONL-2549)', async () => {
    const chat = stub();
    const unregister = registerChatSubmit({ submit: chat.submit });
    const images = [{ id: 'blob-1', mediaType: 'image/png' as const }];

    await submitChatPrompt({ text: 'like this', images });

    expect(chat.requests[0]?.images).toBe(images);
    unregister();
  });

  it('names no images when the caller names none, so no other surface’s are inherited (ONL-2549)', async () => {
    const chat = stub();
    const unregister = registerChatSubmit({ submit: chat.submit });

    await submitChatPrompt({ text: 'hi' });

    expect(chat.requests[0]?.images).toBeUndefined();
    unregister();
  });

  it('refuses again after unregistering', async () => {
    const chat = stub();
    registerChatSubmit({ submit: chat.submit })();

    expect(await submitChatPrompt({ text: 'hi' })).toEqual({ outcome: 'unavailable' });
    expect(chat.requests).toHaveLength(0);
  });

  it('leaves a newer registration alone when an older one unregisters', async () => {
    const first = stub();
    const second = stub();
    const unregisterFirst = registerChatSubmit({ submit: first.submit });
    const unregisterSecond = registerChatSubmit({ submit: second.submit });

    unregisterFirst();
    await submitChatPrompt({ text: 'hi' });

    expect(second.requests).toHaveLength(1);
    unregisterSecond();
  });

  it('says whether a live submit is registered, and stops saying so once it is not', () => {
    const chat = stub();
    const unregister = registerChatSubmit({ submit: chat.submit });

    expect(isChatSubmitRegistered()).toBe(true);

    unregister();
    expect(isChatSubmitRegistered()).toBe(false);
  });
});
