export interface MatchPart {
  text: string;
  isMatch: boolean;
}

export function matchRanges(text: string, query: string): MatchPart[] {
  const needle = query.trim().toLowerCase();
  if (needle === '' || text === '') return [{ text, isMatch: false }];

  const hay = text.toLowerCase();
  const parts: MatchPart[] = [];
  let from = 0;
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, from)) {
    if (at > from) parts.push({ text: text.slice(from, at), isMatch: false });
    parts.push({ text: text.slice(at, at + needle.length), isMatch: true });
    from = at + needle.length;
  }
  if (parts.length === 0) return [{ text, isMatch: false }];
  if (from < text.length) parts.push({ text: text.slice(from), isMatch: false });
  return parts;
}
