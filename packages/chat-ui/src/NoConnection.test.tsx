import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoConnection } from './NoConnection.js';
import type { ChatStrings } from './strings.js';

const strings = {
  connectionCodexMissingTitle: 'Set up ChatGPT',
  connectionCodexMissingBody: 'ChatGPT needs setup.',
  connectionCodexMissingAction: 'Set up ChatGPT',
  connectionCodexUnauthedTitle: 'Sign in to ChatGPT',
  connectionCodexUnauthedBody: 'Sign in to continue.',
  connectionCodexUnauthedAction: 'Sign in',
} as ChatStrings;

describe('the connection remedy', () => {
  test('an unusable install offers setup', () => {
    const html = renderToStaticMarkup(<NoConnection connection={{ status: 'cli_missing', harness: 'codex' }} strings={strings} onRemedy={() => {}} />);
    expect(html).toContain('chat-connection-remedy');
    expect(html).not.toContain('disabled=""');
  });

  test.each(['setUpCodex', 'signInCodex'] as const)('%s stays visible and disabled while setup reports unknown', (remedy) => {
    const html = renderToStaticMarkup(<NoConnection connection={{ status: 'unknown', harness: 'codex' }} strings={strings} onRemedy={() => {}} remedyBusy={remedy} />);
    expect(html).toContain('chat-connection-remedy');
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(remedy === 'signInCodex' ? 'Sign in' : 'Set up ChatGPT');
  });
});
