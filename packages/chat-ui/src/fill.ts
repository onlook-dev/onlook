// An unknown `{name}` stays in place.
export function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

/** Where `{slot}` stands in `template`, so its value can be its own element; a template without one puts it last. */
export function around(template: string, slot: string): { before: string; after: string } {
  const token = `{${slot}}`;
  const at = template.indexOf(token);
  return at < 0 ? { before: `${template} `, after: '' } : { before: template.slice(0, at), after: template.slice(at + token.length) };
}

/** `template` with nothing in `{slot}`: the slot and the spacing beside it go. */
export function withoutSlot(template: string, slot: string): string {
  const { before, after } = around(template, slot);
  return [before.trim(), after.trim()].filter((part) => part !== '').join(' ');
}

export type SentencePart = { text: string } | { slot: string };

/** `template` cut at each `{slot}` in `slots`, in the order the translation puts them; a slot the template lacks goes last. */
export function sentenceParts(template: string, slots: readonly string[]): SentencePart[] {
  const parts: SentencePart[] = [];
  const pattern = new RegExp(`\\{(${slots.join('|')})\\}`, 'g');
  const placed = new Set<string>();
  let from = 0;
  for (const match of template.matchAll(pattern)) {
    const slot = match[1]!;
    if (match.index > from) parts.push({ text: template.slice(from, match.index) });
    parts.push({ slot });
    placed.add(slot);
    from = match.index + match[0].length;
  }
  if (from < template.length) parts.push({ text: template.slice(from) });
  for (const slot of slots) if (!placed.has(slot)) parts.push({ slot });
  return parts;
}
