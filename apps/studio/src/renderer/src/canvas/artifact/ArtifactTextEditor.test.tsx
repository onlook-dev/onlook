import { takeComplaints } from '../../testing/dom.js';
import { expect, it } from 'bun:test';
import * as React from 'react';
import type { ArtifactTextTarget } from '@studio/events';

const { createRoot } = await import('react-dom/client');
const { ArtifactTextEditor, textEditKeyAction } = await import('./ArtifactTextEditor.js');

const target: ArtifactTextTarget = {
  token: 'prepared', text: 'Hello', rect: { x: 20, y: 40, width: 260, height: 36 },
  style: { fontFamily: 'Arial', fontSize: '28px', fontWeight: '600', lineHeight: '36px', letterSpacing: 'normal', textAlign: 'left', color: 'rgb(0, 0, 0)', backgroundColor: 'rgb(255, 255, 255)' },
};

it('saves on Enter but leaves composition and Shift+Enter to the text field', () => {
  expect(textEditKeyAction('Enter', false, false)).toBe('save');
  expect(textEditKeyAction('Enter', true, false)).toBe('none');
  expect(textEditKeyAction('Enter', false, true)).toBe('none');
  expect(textEditKeyAction('Escape', false, false)).toBe('cancel');
  expect(textEditKeyAction('Escape', false, true)).toBe('none');
});

it('focuses the literal, suppresses duplicate saves and retains a failed draft', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const writes: string[] = [];
  let finish: ((value: { outcome: 'unavailable' }) => void) | undefined;
  let completed = 0;
  const save = (newText: string) => {
    writes.push(newText);
    return new Promise<{ outcome: 'unavailable' }>((resolve) => { finish = resolve; });
  };
  try {
    await React.act(async () => { root.render(<ArtifactTextEditor target={target} stale={false} onSave={save} onDone={() => { completed += 1; }} onCancel={() => {}} />); });
    const field = container.querySelector('textarea')!;
    expect(document.activeElement).toBe(field);
    expect(field.value).toBe('Hello');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, 'Draft & <literal>');
      field.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await React.act(async () => {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      field.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(writes).toEqual(['Draft & <literal>']);
    await React.act(async () => { finish?.({ outcome: 'unavailable' }); });
    expect(completed).toBe(0);
    expect(field.value).toBe('Draft & <literal>');
    expect(container.querySelector('[data-testid="artifact-text-error"]')?.textContent).toContain('not saved');
    expect(container.querySelector('[data-testid="artifact-text-save"]')?.hasAttribute('disabled')).toBe(false);
  } finally {
    await React.act(async () => { root.unmount(); });
    container.remove();
  }
  expect(takeComplaints()).toEqual([]);
});

it('keeps a stale draft selectable and makes it impossible to submit', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let writes = 0;
  try {
    await React.act(async () => { root.render(<ArtifactTextEditor target={target} stale onSave={async () => { writes += 1; return { outcome: 'saved' }; }} onDone={() => {}} onCancel={() => {}} />); });
    const field = container.querySelector('textarea')!;
    expect(field.readOnly).toBe(true);
    expect(field.value).toBe('Hello');
    await React.act(async () => { field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(writes).toBe(0);
    expect(container.querySelector('[data-testid="artifact-text-save"]')?.hasAttribute('disabled')).toBe(true);
  } finally {
    await React.act(async () => { root.unmount(); });
    container.remove();
  }
  expect(takeComplaints()).toEqual([]);
});

it('keeps an unsupported draft editable for correction and retry', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const writes: string[] = [];
  let completed = 0;
  try {
    await React.act(async () => { root.render(<ArtifactTextEditor target={target} stale={false} onSave={async (value) => { writes.push(value); return { outcome: writes.length === 1 ? 'unsupported' : 'saved' }; }} onDone={() => { completed += 1; }} onCancel={() => {}} />); });
    const field = container.querySelector('textarea')!;
    await React.act(async () => { field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(container.querySelector('[data-testid="artifact-text-error"]')?.textContent).toBe('Text not saved. Edit it or use Project Chat.');
    expect(field.readOnly).toBe(false);
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, 'Corrected');
      field.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await React.act(async () => { field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(writes).toEqual(['Hello', 'Corrected']);
    expect(completed).toBe(1);
  } finally {
    await React.act(async () => { root.unmount(); });
    container.remove();
  }
  expect(takeComplaints()).toEqual([]);
});

it('shows the read-only refusal without replacing it with a stale-content message', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await React.act(async () => { root.render(<ArtifactTextEditor target={target} stale={false} onSave={async () => ({ outcome: 'readOnly' })} onDone={() => {}} onCancel={() => {}} />); });
    const field = container.querySelector('textarea')!;
    await React.act(async () => { field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(container.querySelector('[data-testid="artifact-text-error"]')?.textContent).toBe('This artifact is read-only.');
    expect(field.readOnly).toBe(true);
  } finally {
    await React.act(async () => { root.unmount(); });
    container.remove();
  }
  expect(takeComplaints()).toEqual([]);
});
