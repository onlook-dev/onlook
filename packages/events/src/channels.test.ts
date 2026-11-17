import { expect, test } from 'bun:test';
import { CHANNELS } from './channels.js';
import type { EmitRow, InvokeRow, SendRow, ViewRole } from './channel.js';

const invoke: Record<string, InvokeRow> = CHANNELS.invoke;
const send: Record<string, SendRow> = CHANNELS.send;
const emit: Record<string, EmitRow> = CHANNELS.emit;
const views: readonly ViewRole[] = ['tab', 'chrome', 'taskManager'];

test('no two channels a renderer can call share a name', () => {
  const names = [...Object.values(invoke), ...Object.values(send)].map((row) => row.name);
  expect(new Set(names).size).toBe(names.length);
  const emitted = Object.values(emit).map((row) => row.name);
  expect(new Set(emitted).size).toBe(emitted.length);
});

test('a view is offered only the channels main admits it on', () => {
  const refused = [...Object.entries(invoke), ...Object.entries(send)].flatMap(([key, row]) =>
    views.filter((view) => row[view] !== undefined && !row.from.includes(view)).map((view) => `${view}.${key}`),
  );
  expect(refused).toEqual([]);
});

test('each view names a bridge method once', () => {
  for (const view of views) {
    const methods = [...Object.values(invoke), ...Object.values(send), ...Object.values(emit)].flatMap((row) => row[view] ?? []);
    expect(new Set(methods).size).toBe(methods.length);
  }
});
