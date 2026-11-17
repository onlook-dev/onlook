import { Component, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { reportBoundaryCrash } from './errors.js';
import { t } from '@studio/i18n';

type Props = {
  // Main validates the reported region by shape, not against this union, so a
  // new member needs no main-side change (ONL-2563).
  region: 'chat' | 'canvas' | 'chrome' | 'code' | 'task-manager';
  children: ReactNode;
};

type State = { failed: boolean };

export class RegionErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    // The only record written from here: a line of our own would both double
    // the crash in main's log and carry the message, which can quote model
    // output and is what the report deliberately drops.
    reportBoundaryCrash(error, this.props.region);
  }

  private retry = (): void => {
    this.setState({ failed: false });
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <VStack
        gap={4}
        height="100%"
        hAlign="center"
        vAlign="center"
        data-testid={`region-error-${this.props.region}`}
      >
        <Text color="secondary">{t('errorBoundary.body')}</Text>
        <Button label={t('errorBoundary.retry')} onClick={this.retry} />
      </VStack>
    );
  }
}
