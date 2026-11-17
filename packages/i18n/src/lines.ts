const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}　-〿＀-￯]/u;

/** A catalog line break read on one line: a space between words, nothing between two wide characters, which Japanese never spaces. */
export function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, (gap, at: number) => {
    const before = text.slice(0, at).at(-1) ?? '';
    const after = text.charAt(at + gap.length);
    return WIDE.test(before) && WIDE.test(after) ? '' : ' ';
  });
}
