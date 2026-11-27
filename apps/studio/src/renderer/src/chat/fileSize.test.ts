import { afterEach, describe, expect, it } from 'bun:test';
import { setLocale } from '@studio/i18n';
import { formatFileSize } from './fileSize.js';

afterEach(() => setLocale(undefined));

describe('formatFileSize', () => {
  it('counts bytes under a kilobyte, and kilobytes and megabytes above it', () => {
    setLocale('en');
    expect(formatFileSize(1)).toBe('1 byte');
    expect(formatFileSize(512)).toBe('512 bytes');
    expect(formatFileSize(49_357)).toBe('48.2 kB');
    expect(formatFileSize(4_823_117)).toBe('4.6 MB');
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
  });

  it('formats the number in the chosen language', () => {
    setLocale('zh-CN');
    expect(formatFileSize(512)).toBe('512字节');
  });
});
