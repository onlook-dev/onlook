import en, { type Messages } from '../../messages/en';

export type MessageKeyPaths = MessagePaths<Messages>;

export const keys = buildPaths(en) as MessageKeyPaths;

function buildPaths(obj: Record<string, any>, prefix = ''): any {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = (obj as Record<string, any>)[key];
    if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = buildPaths(value, path);
    } else {
      result[key] = path;
    }
  }
  return result;
}

export type MessagePaths<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends string
    ? `${Prefix}${Extract<K, string>}`
    : T[K] extends Record<string, any>
    ? MessagePaths<T[K], `${Prefix}${Extract<K, string>}.`>
    : never;
};
