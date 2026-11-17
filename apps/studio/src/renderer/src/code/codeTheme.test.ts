import { describe, expect, it } from 'bun:test';
import { highlightingFor } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import { codeLanguage } from './codeLanguage.js';
import { studioCodeTheme } from './codeTheme.js';

describe('document syntax in the editor', () => {
  it('gives document structure a treatment without styling ordinary prose', async () => {
    const state = EditorState.create({ extensions: [(await codeLanguage('README.md'))!, studioCodeTheme()] });
    for (const tag of [tags.heading1, tags.strong, tags.emphasis, tags.monospace, tags.link, tags.url, tags.strikethrough, tags.processingInstruction]) {
      expect(highlightingFor(state, [tag])).not.toBeNull();
    }
    expect(highlightingFor(state, [tags.content])).toBeNull();
  });
});
