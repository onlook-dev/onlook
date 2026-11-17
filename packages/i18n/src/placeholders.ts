function placeholders(text: string): string[] {
  return (text.match(/\{\w+\}/g) ?? []).sort();
}

export function placeholderMismatch(source: string, translated: string): string | null {
  const want = placeholders(source).join(' ');
  const got = placeholders(translated).join(' ');
  return want === got ? null : `has ${got || 'no placeholders'} where English has ${want || 'none'}`;
}
