import type { CodeRefusalCode, CodeWriteRefusalCode } from '@studio/events';

import type { StringKey } from '@studio/i18n';

/** The renderer's own words for every code the file bridge answers with; main composes no sentence (ONL-2563). */
const CODE_REFUSAL_COPY: Record<CodeRefusalCode, StringKey> = {
  'no-project': 'code.refused.noProject',
  'out-of-scope': 'code.refused.outOfScope',
  'not-found': 'code.refused.notFound',
  'not-text': 'code.refused.notText',
  'too-large': 'code.refused.tooLarge',
  unreadable: 'code.refused.unreadable',
};

export function codeRefusalKey(code: CodeRefusalCode): StringKey {
  return CODE_REFUSAL_COPY[code];
}

/** A save's causes are its own question, and each gets its own sentence: an unnamed failure is one the designer cannot act on (ONL-2563). */
const CODE_WRITE_REFUSAL_COPY: Record<CodeWriteRefusalCode, StringKey> = {
  'no-project': 'code.refused.noProject',
  'out-of-scope': 'code.save.refused.outOfScope',
  stale: 'code.save.refused.stale',
  permission: 'code.save.refused.permission',
  'no-space': 'code.save.refused.noSpace',
  unwritable: 'code.save.refused.unwritable',
};

export function codeWriteRefusalKey(code: CodeWriteRefusalCode): StringKey {
  return CODE_WRITE_REFUSAL_COPY[code];
}
