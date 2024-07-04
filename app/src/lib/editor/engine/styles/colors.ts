import { formatHex, parse } from 'culori';

export function stringToHex(str: string): string {
  if (!str || str === '') return '';

  const color = parse(str);
  if (!color || color.alpha === 0) return '';
  return formatHex(color);
}