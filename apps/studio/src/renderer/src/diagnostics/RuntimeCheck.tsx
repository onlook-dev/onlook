import { useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { t } from '@studio/i18n';
import { studio } from '../bridge.js';

type State =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ok'; output: string }
  | { kind: 'failed'; error: string };

/** A real pty spawn: node-pty is the app's one native module and fails only inside a packaged build. */
export function RuntimeCheck(): React.JSX.Element {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function check(): Promise<void> {
    setState({ kind: 'checking' });
    try {
      const result = await studio().ptyEcho({ text: 'pty-ok' });
      if (result.error) setState({ kind: 'failed', error: result.error });
      else setState({ kind: 'ok', output: result.output });
    } catch (error) {
      setState({
        kind: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <>
      <Button
        label={t('diag.pty.action')}
        variant="ghost"
        size="sm"
        data-testid="pty-check"
        onClick={() => void check()}
      />
      <Badge
        data-testid="pty-status"
        variant={state.kind === 'ok' ? 'success' : state.kind === 'failed' ? 'error' : 'neutral'}
        label={
          state.kind === 'idle'
            ? t('diag.pty.idle')
            : state.kind === 'checking'
              ? t('diag.pty.checking')
              : state.kind === 'ok'
                ? t('diag.pty.ok', { output: state.output })
                : t('diag.pty.failed', { error: state.error })
        }
      />
    </>
  );
}
