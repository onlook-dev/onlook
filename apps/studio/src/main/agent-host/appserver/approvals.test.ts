import { describe, expect, test } from 'bun:test';

import {
  ChangeRegistry,
  dispatchServerRequest,
  questionResult,
  toStudioQuestions,
  type PendingQuestion,
  type PendingApproval,
  type RawQuestion,
} from './approvals.js';

const RAW_QUESTION: RawQuestion = {
  id: 'display_choice',
  header: 'Preference',
  question: 'Which option do you prefer?',
  isOther: true,
  isSecret: false,
  options: [
    { label: 'tabs (Recommended)', description: 'Use tabs as the preferred organization model.' },
    { label: 'windows', description: 'Use windows as the preferred organization model.' },
  ],
};

const REQUEST_FRAME_PARAMS = {
  threadId: 't1',
  turnId: 'r1',
  itemId: 'call_PHt95E3qGXGGKlnz2exr2cyH',
  questions: [RAW_QUESTION],
  isBlocking: false,
  autoResolutionMs: null,
};

describe('MCP consent dispatch (ONL-3087)', () => {
  const consent = {
    serverName: 'figma', mode: 'form', message: 'Allow Figma to read this file?',
    requestedSchema: { type: 'object', properties: {} },
    _meta: { codex_approval_kind: 'mcp_tool_call', tool_name: 'get_design_context' },
  };
  function dispatch(params: unknown, host = false) {
    const approvals: PendingApproval[] = [];
    const responses: unknown[] = [];
    const errors: string[] = [];
    dispatchServerRequest('mcpServer/elicitation/request', 'request-1', params, new ChangeRegistry(), {
      isHostServer: () => host,
      onApproval: (pending) => approvals.push(pending),
      respond: (_id, result) => responses.push(result),
      respondError: (_id, message) => errors.push(message),
    });
    return { approvals, responses, errors };
  }

  test('external consent waits for approval and identifies the server without connector metadata', () => {
    const result = dispatch(consent);
    expect(result.responses).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.approvals[0]?.mcp).toEqual({ server: 'figma', tool: 'get_design_context', arguments: {} });
  });

  test('Studio host calls retain their existing authorization', () => {
    expect(dispatch(consent, true)).toEqual({ approvals: [], responses: [{ action: 'accept', content: null }], errors: [] });
  });

  for (const [name, params] of [
    ['browser authorization', { ...consent, mode: 'url', url: 'https://connector.example.test/authorize' }],
    ['unrecognized form', { ...consent, _meta: {} }],
    ['missing message', { ...consent, message: '' }],
    ['data collection', { ...consent, requestedSchema: { type: 'object', properties: { password: { type: 'string' } } } }],
    ['required fields', { ...consent, requestedSchema: { type: 'object', properties: {}, required: ['password'] } }],
  ] as const) {
    test(`${name} is not misreported as a user denial`, () => {
      const result = dispatch(params);
      expect(result.responses).toEqual([]);
      expect(result.approvals).toEqual([]);
      expect(result.errors).toEqual(['Onlook does not support this connector input request']);
    });
  }
});

describe('item/tool/requestUserInput dispatch', () => {
  test('with no onQuestion wired, answers codex with an error rather than leaving it parked', () => {
    const errors: [string | number, string][] = [];
    const handled = dispatchServerRequest(
      'item/tool/requestUserInput',
      0,
      REQUEST_FRAME_PARAMS,
      new ChangeRegistry(),
      {
        onApproval: () => {
          throw new Error('must not render an approve/deny row for a question');
        },
        respond: () => {
          throw new Error('must not respond without onQuestion');
        },
        respondError: (id, message) => errors.push([id, message]),
      },
    );

    expect(handled).toBe(true);
    expect(errors.map(([id]) => id)).toEqual([0]);
  });

  test('with onQuestion wired, the raw itemId and questions reach it untranslated', () => {
    const asks: PendingQuestion[] = [];
    const handled = dispatchServerRequest(
      'item/tool/requestUserInput',
      0,
      REQUEST_FRAME_PARAMS,
      new ChangeRegistry(),
      {
        onApproval: () => {
          throw new Error('a question is not an approve/deny row');
        },
        onQuestion: (ask) => asks.push(ask),
        respond: () => {
          throw new Error('onQuestion answers later, not synchronously here');
        },
        respondError: () => {
          throw new Error('onQuestion is wired — no error path should fire');
        },
      },
    );

    expect(handled).toBe(true);
    expect(asks).toEqual([
      { requestId: 0, itemId: 'call_PHt95E3qGXGGKlnz2exr2cyH', questions: [RAW_QUESTION] },
    ]);
  });

  test('a missing/malformed `questions` field degrades to an empty array, not a throw', () => {
    const asks: PendingQuestion[] = [];
    dispatchServerRequest(
      'item/tool/requestUserInput',
      1,
      { ...REQUEST_FRAME_PARAMS, questions: undefined },
      new ChangeRegistry(),
      {
        onApproval: () => undefined,
        onQuestion: (ask) => asks.push(ask),
        respond: () => undefined,
        respondError: () => undefined,
      },
    );

    expect(asks).toEqual([{ requestId: 1, itemId: 'call_PHt95E3qGXGGKlnz2exr2cyH', questions: [] }]);
  });
});

describe('toStudioQuestions', () => {
  test('maps a real question through, dropping isOther/isSecret/id — the picker has no arm for them', () => {
    const [mapped] = toStudioQuestions([RAW_QUESTION]);

    expect(mapped).toEqual({
      question: 'Which option do you prefer?',
      header: 'Preference',
      options: [
        { label: 'tabs (Recommended)', description: 'Use tabs as the preferred organization model.' },
        { label: 'windows', description: 'Use windows as the preferred organization model.' },
      ],
    });
  });

  test('drops a question with fewer than two real options — same floor parseQuestions applies', () => {
    const oneOption: RawQuestion = { ...RAW_QUESTION, options: [RAW_QUESTION.options![0]!] };
    const noOptions: RawQuestion = { ...RAW_QUESTION, id: 'q2', options: null };

    expect(toStudioQuestions([oneOption])).toEqual([]);
    expect(toStudioQuestions([noOptions])).toEqual([]);
    expect(toStudioQuestions([oneOption, RAW_QUESTION])).toHaveLength(1);
  });
});

describe('questionResult', () => {
  test('keys the wire response by codex id, not by the picker\'s text key', () => {
    const idByText = new Map([[RAW_QUESTION.question, RAW_QUESTION.id]]);

    const result = questionResult(idByText, { [RAW_QUESTION.question]: 'tabs (Recommended)' });

    expect(result).toEqual({ answers: { display_choice: { answers: ['tabs (Recommended)'] } } });
  });

  test('an answer for a text with no known id is dropped, not guessed at', () => {
    const idByText = new Map([[RAW_QUESTION.question, RAW_QUESTION.id]]);

    const result = questionResult(idByText, { 'a question nobody asked': 'tabs' });

    expect(result).toEqual({ answers: {} });
  });
});
