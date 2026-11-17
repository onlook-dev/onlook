import { use, useMemo } from 'react';
import { highlightCode, classHighlighter, tagHighlighter, tags } from '@lezer/highlight';
import type { LanguageSupport } from '@codemirror/language';
import { codeLanguage } from '../codeLanguage.js';
import { matchRanges } from './matchRanges.js';
import './files.css';

interface SyntaxToken { text: string; classes: string; }

// These document tags are omitted by Lezer's standard class highlighter.
const documentHighlighter = tagHighlighter([
  { tag: tags.monospace, class: 'tok-monospace' },
  { tag: tags.strikethrough, class: 'tok-strikethrough' },
]);

/** Parse only the bounded search excerpt, without mounting an editor for each match. */
export function syntaxTokens(support: LanguageSupport | null, text: string): SyntaxToken[] {
  if (support === null) return [{ text, classes: '' }];
  const tokens: SyntaxToken[] = [];
  highlightCode(text, support.language.parser.parse(text), [classHighlighter, documentHighlighter],
    (part, classes) => tokens.push({ text: part, classes }),
    () => tokens.push({ text: '\n', classes: '' }));
  return tokens;
}

/** Match positions are measured on the full line, so a query can span syntax tokens. */
export function matchedSyntax(tokens: readonly SyntaxToken[], query: string): Array<SyntaxToken & { from: number; isMatch: boolean }> {
  const text = tokens.map((token) => token.text).join('');
  const matches = matchRanges(text, query);
  const result: Array<SyntaxToken & { from: number; isMatch: boolean }> = [];
  let matchIndex = 0;
  let matchEnd = matches[0]?.text.length ?? 0;
  let from = 0;
  for (const token of tokens) {
    const end = from + token.text.length;
    while (from < end) {
      while (from >= matchEnd && matchIndex < matches.length - 1) {
        matchIndex += 1;
        matchEnd += matches[matchIndex]?.text.length ?? 0;
      }
      const to = Math.min(end, matchEnd);
      if (to <= from) break;
      result.push({ text: text.slice(from, to), classes: token.classes, from, isMatch: matches[matchIndex]?.isMatch ?? false });
      from = to;
    }
  }
  return result;
}

export default function SyntaxSnippet({ path, text, query }: { path: string; text: string; query: string }): React.JSX.Element {
  const language = use(codeLanguage(path));
  const tokens = useMemo(() => syntaxTokens(language, text), [language, text]);
  const parts = useMemo(() => matchedSyntax(tokens, query), [tokens, query]);
  return <code className="code-search-snippet">{parts.map((part) => (
    <span key={part.from} className={part.classes || undefined}>
      {part.isMatch ? <mark data-testid="code-files-match">{part.text}</mark> : part.text}
    </span>
  ))}</code>;
}
