import { CHANNELS, type ArgStyle, type BridgeOf, type EmitRow, type InvokeRow, type SendRow, type ViewRole } from '@studio/events';

export interface BridgeTransport {
  invoke(channel: string, ...payload: unknown[]): Promise<unknown>;
  send(channel: string, ...payload: unknown[]): void;
  subscribe(channel: string, listener: (payload: unknown) => void): () => void;
}

export interface BridgeGates {
  diagnostics: boolean;
}

function payloadFrom(style: ArgStyle, args: readonly unknown[]): unknown[] {
  if (style === 'none') return [];
  if (style === 'one') return [args[0]];
  if (style === 'optional') return [args[0] === undefined ? {} : args[0]];
  if (style === 'optional-or-null') return [args[0] ?? {}];
  return [Object.fromEntries(style.map((key, index) => [key, args[index]]))];
}

/** One view's bridge, built from the channel table: a row that names no method for the view adds nothing. */
export function bridgeFor<V extends ViewRole>(view: V, ipc: BridgeTransport, gates: BridgeGates): BridgeOf<typeof CHANNELS, V> {
  const bridge: Record<string, unknown> = {};
  const methodOf = (row: InvokeRow | SendRow | EmitRow): string | undefined =>
    row.gate === undefined || gates[row.gate] ? row[view] : undefined;

  const invokes: Record<string, InvokeRow> = CHANNELS.invoke;
  for (const row of Object.values(invokes)) {
    const method = methodOf(row);
    if (method === undefined) continue;
    bridge[method] = row.refusal === 'ignored'
      ? async (...args: unknown[]): Promise<void> => {
          try {
            await ipc.invoke(row.name, ...payloadFrom(row.request.arg, args));
          } catch {
            // The row says why a refusal is not the caller's to hear.
          }
        }
      : (...args: unknown[]): Promise<unknown> => ipc.invoke(row.name, ...payloadFrom(row.request.arg, args));
  }

  const sends: Record<string, SendRow> = CHANNELS.send;
  for (const row of Object.values(sends)) {
    const method = methodOf(row);
    if (method === undefined) continue;
    bridge[method] = (...args: unknown[]): void => {
      ipc.send(row.name, ...payloadFrom(row.request.arg, args));
    };
  }

  const emits: Record<string, EmitRow> = CHANNELS.emit;
  for (const row of Object.values(emits)) {
    const method = methodOf(row);
    if (method === undefined) continue;
    bridge[method] = row.payload.listener === 'bare'
      ? (listener: () => void): (() => void) => ipc.subscribe(row.name, () => listener())
      : (listener: (payload: unknown) => void): (() => void) => ipc.subscribe(row.name, listener);
  }

  return bridge as BridgeOf<typeof CHANNELS, V>;
}
