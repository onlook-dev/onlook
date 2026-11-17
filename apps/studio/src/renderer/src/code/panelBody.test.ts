import { describe, expect, it } from 'bun:test';
import { panelRefusal } from './panelBody.js';

describe('what the panel shows over what (ONL-2563)', () => {
  it('words a refusal when the editor is what it replaces', () => {
    expect(panelRefusal('not-text', false)).toBe('not-text');
  });

  /* The trap this exists for: a refusal drawn over the BROWSER leaves a designer
     on the file they could not open, with its own door to the files behind it. */
  it('never words a refusal over the browser', () => {
    expect(panelRefusal('not-text', true)).toBeNull();
  });

  it('words nothing when there is nothing to refuse', () => {
    expect(panelRefusal(null, false)).toBeNull();
    expect(panelRefusal(null, true)).toBeNull();
  });
});
