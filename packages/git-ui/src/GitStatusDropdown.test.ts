import { describe, expect, test } from 'bun:test';
import { dropdownOptions } from './GitStatusDropdown.js';

describe('dropdownOptions', () => {
  test('each menu offers its own choices: Create PR and Push, Open in browser and Merge, and Upload Changes on Fix Checks (ONL-2388)', () => {
    expect(dropdownOptions('create-pr')).toEqual(['create-pr', 'push']);
    expect(dropdownOptions('push')).toEqual(['create-pr', 'push']);
    expect(dropdownOptions('ready-to-merge')).toEqual(['open-in-browser', 'merge']);
    expect(dropdownOptions('fix-checks')).toEqual(['upload-changes']);
  });
});
