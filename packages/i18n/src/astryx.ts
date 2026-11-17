import { t, type StringKey } from './index.js';

const STRINGS = {
  '@astryx.dialog.close': 'astryx.dialog.close',
  '@astryx.banner.dismiss': 'astryx.banner.dismiss',
  '@astryx.toast.dismiss': 'astryx.toast.dismiss',
  '@astryx.toast.viewport': 'astryx.toast.viewport',
  '@astryx.codeBlock.copyCode': 'astryx.codeBlock.copyCode',
  '@astryx.codeBlock.copied': 'astryx.codeBlock.copied',
  '@astryx.codeBlock.code': 'astryx.codeBlock.code',
  '@astryx.chatSendButton.send': 'astryx.chatSendButton.send',
  '@astryx.chatSendButton.stop': 'astryx.chatSendButton.stop',
  '@astryx.chat.composerInput.label': 'astryx.chat.composerInput.label',
  '@astryx.chat.composerDrawer.label': 'astryx.chat.composerDrawer.label',
  '@astryx.chat.pastedText.expand': 'astryx.chat.pastedText.expand',
  '@astryx.contextMenu.label': 'astryx.contextMenu.label',
  '@astryx.link.newTab': 'astryx.link.newTab',
  '@astryx.markdown.table': 'astryx.markdown.table',
  '@astryx.markdown.taskList': 'astryx.markdown.taskList',
  '@astryx.resizable.handle.label': 'astryx.resizable.handle.label',
} as const satisfies Record<string, StringKey>;

/** Studio's `ChatMessage`s carry no name, so Astryx labels each by its raw `sender` word; a select keeps that word out of the translation. */
const MESSAGE_FROM = {
  user: 'astryx.chatMessage.messageFrom.user',
  assistant: 'astryx.chatMessage.messageFrom.assistant',
} as const satisfies Record<string, StringKey>;

const literal = (text: string): string => text.replace(/'/g, "''");

export function astryxMessages(): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const [astryxKey, key] of Object.entries(STRINGS)) messages[astryxKey] = literal(t(key));
  const branches = Object.entries(MESSAGE_FROM).map(([sender, key]) => `${sender} {${literal(t(key))}}`);
  messages['@astryx.chatMessage.messageFrom'] = `{sender, select, ${branches.join(' ')} other {Message from {sender}}}`;
  return messages;
}
