import { describe, expect, it } from 'bun:test';
import type { ClientCommand, PromptAttachment } from '@studio/events';
import { acceptPromptCommand, type PromptAdmission } from './command-acceptance.js';
import type { PenPrompt } from './pen.js';

const prompt = (overrides: Partial<Extract<ClientCommand, { type: 'prompt' }>> = {}) => ({
  type: 'prompt' as const,
  text: '',
  ...overrides,
});

const session = { cwd: '/workspace' };

function admitter(answer: PromptAdmission = 'sent') {
  const admitted: PenPrompt[] = [];
  return {
    admitted,
    admit: (given: PenPrompt): PromptAdmission => {
      admitted.push(given);
      return answer;
    },
  };
}

describe('acceptPromptCommand', () => {
  it('admits file-only and skill-only prompts without dropping their payload', () => {
    const file = { kind: 'file' as const, id: 'blob-1', name: 'brand.svg', mediaType: 'text/plain' as const, originalSize: 42 };
    const skill = { kind: 'skill' as const, name: 'brand', description: 'Apply the brand', agent: 'claude' as const };
    for (const attachments of [[file], [skill], [file, skill]]) {
      const pen = admitter();
      const settled: string[][] = [];
      expect(acceptPromptCommand(prompt({ attachments }), session, (_cwd, ids) => settled.push(ids), pen.admit)).toEqual({ accepted: true });
      expect(pen.admitted[0]?.attachments).toEqual(attachments);
      expect(settled).toEqual([attachments.includes(file) ? [file.id] : []]);
    }
  });

  it('carries a selected artifact into the admitted prompt, beside the text (ONL-2593)', () => {
    const pen = admitter();
    const artifact = { kind: 'artifact' as const, artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'tokyo' };
    expect(acceptPromptCommand(prompt({ text: 'make one for amsterdam', attachments: [artifact] }), session, () => {}, pen.admit)).toEqual({ accepted: true });
    expect(pen.admitted[0]?.attachments).toContainEqual(artifact);
  });

  it('marks a send from the next-tasks card as a suggestion, and nothing else as one (ONL-2899)', () => {
    const pen = admitter();
    acceptPromptCommand(prompt({ text: 'Show the page on mobile', suggestion: { index: 1, taps: 2 } }), session, () => {}, pen.admit);
    acceptPromptCommand(prompt({ text: 'make it teal' }), session, () => {}, pen.admit);
    expect(pen.admitted.map((given) => given.suggestion)).toEqual([{ index: 1, taps: 2 }, undefined]);
  });

  it('takes a suggestion send naming no card the card can hold as the designer\'s own words (ONL-2959)', () => {
    const pen = admitter();
    for (const index of [-1, 3, 0.5]) {
      acceptPromptCommand(prompt({ text: 'Show the page on mobile', suggestion: { index, taps: 1 } }), session, () => {}, pen.admit);
    }
    expect(pen.admitted.map((given) => given.suggestion)).toEqual([undefined, undefined, undefined]);
  });

  it('takes a suggestion send with no tap behind it as the designer\'s own words (ONL-2977)', () => {
    const pen = admitter();
    for (const taps of [0, 1.5, -1]) {
      acceptPromptCommand(prompt({ text: 'Show the page on mobile', suggestion: { index: 0, taps } }), session, () => {}, pen.admit);
    }
    expect(pen.admitted.map((given) => given.suggestion)).toEqual([undefined, undefined, undefined]);
  });

  it('rejects when there is no live session', () => {
    const pen = admitter();
    expect(acceptPromptCommand(prompt({ text: 'hello' }), undefined, () => {}, pen.admit)).toEqual({
      accepted: false,
    });
    expect(pen.admitted).toEqual([]);
  });

  it('rejects invalid-only payloads without admitting or settling', () => {
    let settled = false;
    const pen = admitter();
    const invalid = { kind: 'element', id: '' } as PromptAttachment;

    expect(
      acceptPromptCommand(
        prompt({ text: '   ', attachments: [invalid] }),
        session,
        () => {
          settled = true;
        },
        pen.admit,
      ),
    ).toEqual({ accepted: false });
    expect(pen.admitted).toEqual([]);
    expect(settled).toBe(false);
  });

  it('rejects a refused prompt and keeps image holds pending', () => {
    let settled = false;
    const pen = admitter('refused');
    expect(
      acceptPromptCommand(
        prompt({ text: 'hello' }),
        session,
        () => {
          settled = true;
        },
        pen.admit,
      ),
    ).toEqual({ accepted: false });
    expect(settled).toBe(false);
  });

  it('settles only admitted image ids once the prompt is taken', () => {
    const image = { id: 'img-1', mediaType: 'image/png' as const };
    const settled: string[][] = [];
    const pen = admitter();

    expect(
      acceptPromptCommand(prompt({ attachments: [image] }), session, (_cwd, ids) => settled.push(ids), pen.admit),
    ).toEqual({ accepted: true });
    expect(pen.admitted.at(0)?.attachments).toEqual([image]);
    expect(settled).toEqual([['img-1']]);
  });

  it('says a held prompt was held, and keeps its image holds as their only root (ONL-2294)', () => {
    const image = { id: 'img-1', mediaType: 'image/png' as const };
    const settled: string[][] = [];
    const pen = admitter('held');

    expect(
      acceptPromptCommand(
        prompt({ text: 'and a footer', attachments: [image], context: 'sel' }),
        session,
        (_cwd, ids) => settled.push(ids),
        pen.admit,
      ),
    ).toEqual({ accepted: true, held: true });
    expect(pen.admitted).toEqual([{ text: 'and a footer', attachments: [image], context: 'sel' }]);
    expect(settled).toEqual([]);
  });

  it('frame attachments admit nothing alone but ride a real prompt through (ONL-2045)', () => {
    const frame: PromptAttachment = { kind: 'frame', name: 'Journal copy' };
    const pen = admitter();

    expect(acceptPromptCommand(prompt({ attachments: [frame] }), session, () => {}, pen.admit)).toEqual({
      accepted: false,
    });
    expect(pen.admitted).toEqual([]);

    expect(
      acceptPromptCommand(prompt({ text: 'align these', attachments: [frame] }), session, () => {}, pen.admit),
    ).toEqual({ accepted: true });
    expect(pen.admitted.at(0)?.attachments).toEqual([frame]);
  });

  it('accepts element-only prompts after runtime admission', () => {
    const element: PromptAttachment = {
      kind: 'element',
      id: 'el-1',
      tag: 'button',
      domPath: 'html:nth-of-type(1) > body:nth-of-type(1) > button:nth-of-type(1)',
      outerHtmlSnippet: '<button>Save</button>',
      textContent: 'Save',
      classes: [],
      frameUrl: 'http://localhost:3000/settings',
    };
    const pen = admitter();

    expect(
      acceptPromptCommand(prompt({ attachments: [element] }), session, () => {}, pen.admit),
    ).toEqual({ accepted: true });
    expect(pen.admitted.at(0)?.attachments).toEqual([element]);
  });
});
