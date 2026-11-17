import { IconEmail1 } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconEmail1';
import { IconGoogle } from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconGoogle';
import { GithubIcon } from '../icons/glyphs.js';
import type { SignInMethod } from './useAccountAction.js';

const MARK = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  width: 20, height: 20, pointerEvents: 'none',
} as const;
/** `flexShrink`, or the box negotiates the glyph back down to its own 20px (ONL-2821). */
const GLYPH = { width: 20, height: 20, flexShrink: 0 } as const;

export function SignInIcon({ method }: { method: SignInMethod }): React.JSX.Element {
  return <span style={MARK} data-testid="account-mark">
    {method === 'google' ? <IconGoogle aria-hidden="true" mode="raw" size={20} style={GLYPH} />
      : method === 'github' ? <GithubIcon aria-hidden="true" style={GLYPH} />
        : <IconEmail1 aria-hidden="true" mode="raw" size={20} className="account-mark-mail" style={GLYPH} />}
  </span>;
}
