import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { DropdownMenu, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@astryxdesign/core/DropdownMenu';
import type { ClaudeBrowser } from '@studio/events';
import type { SetupState } from './state.js';
import { fill, type OnboardingUiStrings } from './strings.js';

export function signInLabel(state: SetupState): { label?: string } {
  const label = 'copy' in state ? state.copy?.signIn : undefined;
  return label === undefined ? {} : { label };
}

export interface ClaudeSignInButtonProps {
  browsers?: readonly ClaudeBrowser[];
  strings: OnboardingUiStrings;
  onSignIn?: (browserId?: string) => void;
  isDisabled?: boolean;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary';
  testId: string;
  label?: string;
  wrapLabel?: boolean;
}

// The accent re-pointed to white, as New project does, so each half keeps the primary variant's own hover and press.
// The group's own border would split the pair at full height; only the short seam divides it.
const NO_BORDER = { '--color-accent': 'var(--color-background-inverted)', borderColor: 'transparent' } as React.CSSProperties;

/** The menu trigger's seam, as the Projects screen's New project button draws it (ONL-2593). */
const MENU_SEAM = {
  ...NO_BORDER,
  backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.22))',
  backgroundRepeat: 'no-repeat',
  backgroundOrigin: 'border-box',
  backgroundPosition: 'left center',
  backgroundSize: '1px 55%',
} as React.CSSProperties;

// Each half dims on its own hover, as New project's do in the Studio stylesheet (ONL-2593).
const HOVER_RULES = '[data-split-sign-in] button:hover:not(:disabled){filter:brightness(0.9)}';

function Chevron(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClaudeSignInButton({ browsers, strings, onSignIn, isDisabled, size, variant = 'primary', testId, label, wrapLabel }: ClaudeSignInButtonProps): React.JSX.Element {
  const fallback = browsers?.find((browser) => browser.isDefault)?.id ?? browsers?.[0]?.id;
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);
  const button = { label: label ?? strings.action['sign-in'], variant, isDisabled, size };
  const responsiveStyle = !wrapLabel ? undefined : { minWidth: 0, maxWidth: '100%', width: 'max-content', flex: '0 1 auto', whiteSpace: 'normal', overflowWrap: 'anywhere', height: 'auto', minHeight: `var(--size-element-${size ?? 'md'})`, paddingBlock: 'var(--spacing-1)' } as const;
  if (browsers === undefined || browsers.length < 2) {
    return <Button {...button} style={responsiveStyle} onClick={() => onSignIn?.()} data-testid={testId} />;
  }
  const chosen = browsers.find((browser) => browser.id === chosenId) ?? browsers.find((browser) => browser.id === fallback);
  return (
    <span data-split-sign-in="" style={{ display: 'contents' }}>
    <style href="split-sign-in" precedence="medium">{HOVER_RULES}</style>
    <ButtonGroup label={button.label} size={size ?? 'md'} style={wrapLabel ? { width: 'max-content', maxWidth: '100%', minWidth: 0 } : undefined} data-testid={testId}>
      <Button {...button} label={chosen === undefined ? button.label : fill(strings.signInWith, { browser: chosen.name })}
        style={{ ...(variant === 'primary' ? NO_BORDER : undefined), ...responsiveStyle }} onClick={() => onSignIn?.(chosen?.id)} data-testid={`${testId}-main`} />
      <DropdownMenu hasChevron={false} placement="below" menuWidth={220} data-testid={`${testId}-menu`}
        button={{ label: strings.chooseBrowser, variant, size: size ?? 'md', isIconOnly: true, isDisabled, style: { ...(variant === 'primary' ? MENU_SEAM : undefined), ...(!wrapLabel ? {} : { height: 'auto', width: `var(--size-element-${size ?? 'md'})`, flexShrink: 0 }) }, icon: <Chevron /> }}>
        <DropdownMenuRadioGroup value={chosen?.id} onChange={setChosenId} aria-label={strings.chooseBrowser}>
          {browsers.map((browser) => (
            <DropdownMenuRadioItem key={browser.id} value={browser.id} label={browser.isDefault ? fill(strings.browserDefault, { browser: browser.name }) : browser.name} />
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenu>
    </ButtonGroup>
    </span>
  );
}
