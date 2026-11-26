import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { GlyphSlot } from '@studio/chat-ui';
import type { ClaudeBrowser } from '@studio/events';
import { ClaudeSignInButton, signInLabel } from './ClaudeSignInButton.js';
import { OtherAgentChoice } from './OtherAgentChoice.js';
import { SignInCard, type CardGlyphs } from './SignInCard.js';
import { footerFor, isSignedIn, otherAgentFor, type SetupAction, type SetupState } from './state.js';
import type { OnboardingUiStrings } from './strings.js';

export interface SetupDialogProps {
  state: SetupState;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAction?: (action: SetupAction, browserId?: string) => void;
  browsers?: readonly ClaudeBrowser[];
  onCodeChange?: (code: string) => void;
  strings: OnboardingUiStrings;
  glyphs: CardGlyphs;
  /** `info` lets Escape and the backdrop close it; the wiring ticket decides per state. */
  purpose?: 'info' | 'form' | 'required';
  /** Footer actions the host cannot honour right now (a Done with nothing pasted); drawn disabled, never hidden. */
  disabledActions?: readonly SetupAction[];
  /** A detection in flight behind the drawn state: every footer action but Cancel is disabled until it lands. */
  isBusy?: boolean;
  actionError?: string;
  /** False on a host that cannot open the other agent's setup: its card is never drawn there (ONL-2496, ONL-2903). */
  offersOtherAgent?: boolean;
  /** Showroom only: the content without the modal. */
  isInline?: boolean;
  testId?: string;
}

/** Cancel is exempt from `isBusy`: it is the only control an in-flight sheet offers, and stopping the check is what it does (ONL-2496). */
export function isActionDisabled(action: SetupAction, disabledActions: readonly SetupAction[] | undefined, isBusy: boolean): boolean {
  return (isBusy && action !== 'cancel') || (disabledActions?.includes(action) ?? false);
}

/** The board's card width; the body's 40px avatar plus two-line copy is measured at it. */
const DIALOG_WIDTH = 440;

export function SetupDialog({
  state,
  isOpen,
  onOpenChange,
  onAction,
  onCodeChange,
  strings,
  glyphs,
  purpose = 'info',
  disabledActions,
  isBusy = false,
  actionError,
  offersOtherAgent = true,
  isInline = false,
  testId,
  browsers,
}: SetupDialogProps): React.JSX.Element {
  const footer = footerFor(state);
  const other = offersOtherAgent ? otherAgentFor(state) : undefined;
  const primaryLabel = (action: SetupAction): string =>
    action === 'check-again' && 'retryLabel' in state && state.retryLabel !== undefined ? state.retryLabel : strings.action[action];
  const header = isSignedIn(state) ? strings.harnessName[state.harness] : strings.dialogHeader[state.harness];
  const isDisabled = (action: SetupAction): boolean => isActionDisabled(action, disabledActions, isBusy);
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose={purpose}
      width={DIALOG_WIDTH}
      isInline={isInline}
      data-testid={testId ?? 'setup-dialog'}
      data-provider={state.harness}
      data-state={state.state}
      data-busy={isBusy ? 'true' : undefined}
    >
      <Layout
        header={
          <DialogHeader
            title={header}
            startContent={<GlyphSlot size={18}>{glyphs[state.harness]}</GlyphSlot>}
            onOpenChange={onOpenChange}
            hasDivider
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4} width="100%">
              <SignInCard state={state} host="dialog" strings={strings} glyphs={glyphs} onAction={onAction} {...(onCodeChange === undefined ? {} : { onCodeChange })} />
              {actionError ? <Text type="supporting" color="primary" role="alert" data-testid="setup-action-error">{actionError}</Text> : null}
              {other ? (
                <OtherAgentChoice offer={other} strings={strings} glyphs={glyphs} isDisabled={isDisabled('use-other-agent')} onChoose={() => onAction?.('use-other-agent')} />
              ) : null}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" data-testid="setup-dialog-footer">
              {footer.ghost ? (
                <Button label={strings.action[footer.ghost]} variant="ghost" isDisabled={isDisabled(footer.ghost)} onClick={() => onAction?.(footer.ghost!)} data-testid={`setup-action-${footer.ghost}`} />
              ) : null}
              {footer.primary === 'sign-in' ? (
                <ClaudeSignInButton browsers={browsers} strings={strings} {...(state.harness === 'claude' ? signInLabel(state) : { label: primaryLabel('sign-in') })} isDisabled={isDisabled('sign-in')} onSignIn={(browserId) => onAction?.('sign-in', browserId)} testId="setup-action-sign-in" />
              ) : footer.primary ? (
                <Button label={primaryLabel(footer.primary)} variant="primary" isDisabled={isDisabled(footer.primary)} onClick={() => onAction?.(footer.primary!)} data-testid={`setup-action-${footer.primary}`} />
              ) : null}
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
