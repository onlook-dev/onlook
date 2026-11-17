import { expect, test } from 'bun:test';
import { emptyState } from '@studio/events';
import { CHAT_FIXTURE_STRINGS } from '../dev/ChatFixture.js';
import { ForwardIcon } from '../icons/glyphs.js';
import { chatPanelProps, type ComposerInput, type TranscriptInput } from './panelProps.js';

const noop = (): void => {};
const transcript: TranscriptInput = { state: emptyState, connection: { status: 'ok' }, strings: CHAT_FIXTURE_STRINGS, chevronIcon: ForwardIcon, onInterrupt: noop, onRespond: noop, onCopy: noop };
const composer: ComposerInput = { composerValue: '', onComposerChange: noop, onSend: noop };

test('an input the caller leaves out sends no key', () => {
  expect(Object.keys(chatPanelProps({ transcript, composer })).sort()).toEqual(['chevronIcon', 'composerValue', 'connection', 'onComposerChange', 'onCopy', 'onInterrupt', 'onRespond', 'onSend', 'state', 'strings']);
});

test('an input that holds nothing sends no key, and a key written as undefined stays', () => {
  const props = chatPanelProps({
    transcript: { ...transcript, workingRow: undefined },
    composer: { ...composer, composerStatus: undefined },
    setup: { narration: undefined, welcomeSlot: undefined, stepGlyphs: undefined, failedLine: undefined },
    notices: { notice: undefined, connectionRemedyBusy: undefined, signIn: { slot: undefined, placement: 'band' }, signInLine: undefined, onStopAndResend: undefined },
  });
  expect(Object.keys(props).filter((key) => !(key in chatPanelProps({ transcript, composer })))).toEqual(['composerStatus']);
});

test('the sign-in card brings its placement, and the attachments their edit version', () => {
  const props = chatPanelProps({ transcript, composer: { ...composer, attachments: [{ kind: 'frame', name: 'Home' }] }, notices: { signIn: { slot: 'card', placement: 'transcript' } } });
  expect(props.signInSlot).toBe('card');
  expect(props.signInPlacement).toBe('transcript');
  expect(props.composerEditVersion).toBe('[{"kind":"frame","name":"Home"}]');
});

test('the mode control leaves the composer when the model menu carries it', () => {
  const control = { label: 'Auto', rows: [], isDisabled: true };
  expect(chatPanelProps({ transcript, composer: { ...composer, permission: { control } } }).permissionMode).toBeDefined();
  const moved = chatPanelProps({ transcript, composer: { ...composer, permission: { control, isInModelMenu: true } } });
  expect('permissionMode' in moved).toBe(true);
  expect(moved.permissionMode).toBeUndefined();
});
