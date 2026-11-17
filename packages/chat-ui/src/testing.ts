export { useStickyUserMessage } from './useStickyUserMessage.js';

export function zzStrings<T>(bag: T): T {
  return JSON.parse(JSON.stringify(bag, (_key, value: unknown) => (typeof value === 'string' ? 'ZZ' : value))) as T;
}
