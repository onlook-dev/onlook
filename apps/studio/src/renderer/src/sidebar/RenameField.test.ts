import { describe, expect, test } from 'bun:test';

import { renameFieldAction } from './RenameField.jsx';

describe('the panel rename field, shared by both lists', () => {
  test('Enter commits and Escape cancels', () => {
    expect(renameFieldAction('Enter')).toBe('commit');
    expect(renameFieldAction('Escape')).toBe('cancel');
  });

  test('every other key belongs to the caret — including the list arrows', () => {
    for (const key of ['ArrowDown', 'ArrowUp', 'Delete', 'Backspace', 'Tab', 'a']) {
      expect(renameFieldAction(key)).toBeNull();
    }
  });
});
