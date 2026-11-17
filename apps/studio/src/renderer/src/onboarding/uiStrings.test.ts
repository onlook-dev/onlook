import { describe, expect, test } from 'bun:test';
import { t } from '@studio/i18n';
import { onboardingUiStrings } from './uiStrings.js';

describe('onboardingUiStrings', () => {
  const bag = onboardingUiStrings();

  test('hands the package its percent and email templates unfilled, for it to fill', () => {
    expect(bag.tileLine.codex.downloading).toContain('{percent}');
    expect(bag.dialogTitle.codex.connected).toContain('{email}');
  });
});

describe('bundled Claude recovery (ONL-2671)', () => {
  test('Project Chat directs users to replace Onlook and reopen it, not install Claude Code', () => {
    expect(t('chat.connection.missing.title')).toBe('Claude couldn’t start');
    expect(t('chat.connection.missing.body')).toBe(
      'Claude comes with Onlook. Download Onlook again and replace your installed copy, then reopen it. If Claude still won’t start, contact support.',
    );
  });

  test('Claude setup shares Project Chat’s bundled-runtime recovery instructions', () => {
    const strings = onboardingUiStrings();
    expect(strings.runtimeMissingTitle).toBe(t('chat.connection.missing.title'));
    expect(strings.runtimeMissingBody).toBe(t('chat.connection.missing.body'));
  });
});
