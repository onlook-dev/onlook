declare const CARRIED: unique symbol;

/** Carries a type through the channel table and holds nothing at runtime. */
export interface Shape<T> {
  readonly [CARRIED]?: T;
}

export function of<T>(): Shape<T> {
  return {};
}

/** A main→renderer event whose listener is called with no arguments, whatever main sent. */
export const ignored: Shape<void> & { readonly listener: 'bare' } = { listener: 'bare' };

export type ViewRole = 'tab' | 'chrome' | 'taskManager';
export const TAB = ['tab'] as const;
export const CHROME = ['chrome'] as const;
export const ANY = ['tab', 'chrome'] as const;
export const TASK_MANAGER = ['taskManager'] as const;

/** How a bridge method's arguments become the one payload that crosses: none, the first as given, the first or `{}`, or each one under a key. */
export type ArgStyle = 'none' | 'one' | 'optional' | 'optional-or-null' | readonly string[];

export interface Request<T, A extends ArgStyle = ArgStyle> extends Shape<T> {
  readonly arg: A;
}

export const none: Request<void, 'none'> = { arg: 'none' };

export function one<T>(): Request<T, 'one'> {
  return { arg: 'one' };
}

/** `undefined` crosses as `{}`. */
export function optional<T>(): Request<T, 'optional'> {
  return { arg: 'optional' };
}

/** `undefined` and `null` both cross as `{}`. */
export function optionalOrNull<T>(): Request<T, 'optional-or-null'> {
  return { arg: 'optional-or-null' };
}

export function fields<T>(): <const K extends readonly (keyof T & string)[]>(...keys: K) => Request<T, K> {
  return (...keys) => ({ arg: keys });
}

export type ProjectScope = 'project' | 'project-or-none';
export type ProjectClaim = 'cwd' | 'docId';

interface Exposure {
  /** The method each view's bridge exposes for the channel; a view with none cannot reach it from its page. */
  readonly tab?: string;
  readonly chrome?: string;
  readonly taskManager?: string;
  /** Exposed only while main has opened that gate. */
  readonly gate?: 'diagnostics';
}

interface FromRenderer extends Exposure {
  readonly name: string;
  /** The view roles main admits as the sender; any other is refused before the handler runs. */
  readonly from: readonly ViewRole[];
  /** Main resolves the sending view's Project before the handler runs. `project` refuses a view with none; `project-or-none` hands the handler `undefined`. */
  readonly scope?: ProjectScope;
  /** The request field that names the Project (`cwd`, its worktree) or its Canvas document (`docId`); main refuses a request naming another's. */
  readonly names?: ProjectClaim;
  readonly request: Request<unknown>;
}

export interface InvokeRow extends FromRenderer {
  readonly response: Shape<unknown>;
  /** The bridge answers `undefined` when main refuses, and never rejects. */
  readonly refusal?: 'ignored';
}

export type SendRow = FromRenderer;

export interface EmitRow extends Exposure {
  readonly name: string;
  readonly payload: Shape<unknown> & { readonly listener?: 'bare' };
}

export interface ChannelTable {
  readonly invoke: Record<string, InvokeRow>;
  readonly send: Record<string, SendRow>;
  readonly emit: Record<string, EmitRow>;
}

type Carried<S> = S extends Shape<infer T> ? T : never;

export type RequestOf<Row> = Row extends { request: infer R } ? Carried<R> : never;
export type ResponseOf<Row> = Row extends { response: infer R } ? Carried<R> : never;
export type PayloadOf<Row> = Row extends { payload: infer P } ? Carried<P> : never;

/** The names of the rows declared with one scope. */
export type ScopedNames<Rows, S extends ProjectScope> = {
  [K in keyof Rows]: Rows[K] extends { name: infer N extends string; scope: S } ? N : never;
}[keyof Rows];

/** The rows whose `names` field is not a field of their request; empty when the table is sound. */
export type Misnamed<Rows> = {
  [K in keyof Rows]: Rows[K] extends { names: infer F extends string; request: Shape<infer T> } ? (F extends keyof T ? never : K) : never;
}[keyof Rows];

export type ChannelNames<Rows extends Record<string, { name: string }>> = {
  readonly [K in keyof Rows]: Rows[K]['name'];
};

export function channelNames<const Rows extends Record<string, { name: string }>>(rows: Rows): ChannelNames<Rows> {
  return Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row.name])) as ChannelNames<Rows>;
}

export type InvokeContract<Rows> = {
  -readonly [K in keyof Rows as Rows[K] extends { name: infer N extends string } ? N : never]: {
    request: RequestOf<Rows[K]>;
    response: ResponseOf<Rows[K]>;
  };
};

export type SendContract<Rows> = {
  -readonly [K in keyof Rows as Rows[K] extends { name: infer N extends string } ? N : never]: RequestOf<Rows[K]>;
};

export type EmitContract<Rows> = {
  -readonly [K in keyof Rows as Rows[K] extends { name: infer N extends string } ? N : never]: PayloadOf<Rows[K]>;
};

type Call<T, A, Out> = A extends 'none'
  ? () => Out
  : A extends 'one'
    ? (request: T) => Out
    : A extends 'optional' | 'optional-or-null'
      ? (request?: T) => Out
      : A extends readonly (keyof T)[]
        ? (...args: { [I in keyof A]: A[I] extends keyof T ? T[A[I]] : never }) => Out
        : never;

type Subscribe<P> = (listener: [P] extends [void] ? () => void : (payload: P) => void) => () => void;

type Method<Row> = Row extends { request: Request<infer T, infer A>; response: Shape<infer Answer> }
  ? Call<T, A, Promise<Answer>>
  : Row extends { request: Request<infer T, infer A> }
    ? Call<T, A, void>
    : Row extends { payload: Shape<infer P> }
      ? Subscribe<P>
      : never;

type Always<Rows, V extends ViewRole> = {
  -readonly [K in keyof Rows as Rows[K] extends { gate: string } ? never : Rows[K] extends Record<V, infer M extends string> ? M : never]: Method<Rows[K]>;
};

type WhileGated<Rows, V extends ViewRole> = {
  -readonly [K in keyof Rows as Rows[K] extends { gate: string } & Record<V, infer M extends string> ? M : never]?: Method<Rows[K]>;
};

/** The methods one view's bridge carries: every row that names a method for that view. */
export type BridgeOf<T extends ChannelTable, V extends ViewRole> =
  & Always<T['invoke'], V> & Always<T['send'], V> & Always<T['emit'], V>
  & WhileGated<T['invoke'], V> & WhileGated<T['send'], V> & WhileGated<T['emit'], V>;
