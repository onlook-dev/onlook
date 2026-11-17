import '../testing/dom.js';
import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyState, type ToolCallView } from '@studio/events';
import { ChatPanel, type ChatStrings } from '@studio/chat-ui';
import { CHAT_PLACE } from './lines.js';

const text = new Proxy({}, { get: () => 'x' });
const strings = new Proxy({} as ChatStrings, {
  get: (_target, key) => (key === 'toolVerbs' ? new Proxy({}, { get: () => ({ running: 'x', done: 'x' }) }) : key === 'questionSheet' || key === 'toolRows' ? text : 'x'),
});
const option = { optionId: 'allow', label: 'Allow', kind: 'allow_once' as const };
const asking = (id: string, questions?: NonNullable<ToolCallView['permission']>['questions']): ToolCallView => ({
  toolCallId: id,
  name: questions === undefined ? 'Bash' : 'AskUserQuestion',
  kind: 'other',
  title: 'x',
  status: 'pending',
  displayStatus: 'awaiting_approval',
  startedAt: 0,
  permission: { requestId: `r-${id}`, options: [option], ...(questions === undefined ? {} : { questions }) },
});

function drawn(call: ToolCallView): Document {
  const markup = renderToStaticMarkup(
    <ChatPanel state={{ ...emptyState, items: [{ kind: 'user', id: 'u1', text: 'Go' }, { kind: 'tools', id: 'g1', calls: [call] }], awaitingApproval: [call], isStreaming: true }} connection={{ status: 'ok' }} strings={strings} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} chevronIcon={() => <span />} />,
  );
  document.body.innerHTML = markup;
  return document;
}

describe('where a waiting line in the status list takes the person (ONL-2973)', () => {
  const question = asking('q1', [{ question: 'Which font?', header: 'Font', options: [{ label: 'Serif', description: '' }, { label: 'Sans', description: '' }] }]);

  it('finds the open question', () => {
    expect(drawn(question).querySelector(CHAT_PLACE.question)).not.toBeNull();
  });

  it('finds the approval the agent waits on', () => {
    expect(drawn(asking('b1')).querySelector(CHAT_PLACE.approval)).not.toBeNull();
  });
});
