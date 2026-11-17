import { describe, expect, test } from 'bun:test';
import { placeholderMismatch } from './placeholders.js';

describe('placeholderMismatch', () => {
  test('accepts a translation that moves its placeholders', () => {
    expect(placeholderMismatch('Delete {name} from {place}', '{place} から {name} を削除')).toBeNull();
  });

  test('rejects a translated, dropped or duplicated placeholder', () => {
    expect(placeholderMismatch('Quit {app}', '{アプリ}を終了')).not.toBeNull();
    expect(placeholderMismatch('{count} files', 'ファイル')).not.toBeNull();
    expect(placeholderMismatch('{count} files', '{count} {count} 個のファイル')).not.toBeNull();
  });
});
