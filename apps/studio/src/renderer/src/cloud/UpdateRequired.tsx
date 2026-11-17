import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { t } from '@studio/i18n';
import { OnlookWordmark } from '../icons/OnlookWordmark.js';
import { useOnlookState } from './useOnlookState.js';
import { studio } from '../bridge.js';
import { useModal } from '../overlay/modalStack.js';

export const UPDATE_DOWNLOAD_URL = 'https://download.onlook.com/latest';

export function UpdateRequiredScreen({ onUpdate }: { onUpdate: () => void }): React.JSX.Element {
  return (
    <VStack width="100%" height="100%" align="center" justify="center" padding={8}
      data-testid="update-required-screen" style={{ boxSizing: 'border-box', background: 'var(--studio-ground)', overflow: 'auto' }}>
      <VStack width="100%" align="start" gap={8} style={{ maxWidth: 440 }}>
        <OnlookWordmark role="img" aria-label={t('app.name')} />
        <VStack align="start" gap={3}>
          <Heading level={1} id="update-required-title" style={{ textWrap: 'balance' }}>{t('cloudUpdate.title')}</Heading>
          <Text color="secondary" style={{ lineHeight: 1.6 }}>{t('cloudUpdate.explanation')}</Text>
        </VStack>
        <VStack align="start" gap={4}>
          <Button label={t('cloudUpdate.action')} variant="primary" size="md" onClick={onUpdate} data-testid="download-update" />
          <Text size="sm" color="secondary" style={{ lineHeight: 1.6 }}>{t('cloudUpdate.workKept')}</Text>
        </VStack>
      </VStack>
    </VStack>
  );
}

function UpdateRequiredDialog(): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const reported = useRef(false);
  useModal(true, 'gate');
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    if (!reported.current) {
      reported.current = true;
      studio().telemetryEvent({ event: 'cloud_update_required_shown', properties: {} });
    }
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby="update-required-title" onCancel={(event) => event.preventDefault()}
      onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Escape') event.preventDefault(); }} onKeyUp={(event) => event.stopPropagation()}
      style={{ position: 'fixed', inset: 0, margin: 0, padding: 0, border: 0, width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', color: 'var(--color-text-primary)' }}>
      <UpdateRequiredScreen onUpdate={() => {
        studio().telemetryEvent({ event: 'cloud_update_download_clicked', properties: {} });
        window.open(UPDATE_DOWNLOAD_URL, '_blank', 'noopener');
      }} />
    </dialog>
  );
}

export function CloudCompatibility({ children }: { children: ReactNode }): React.JSX.Element {
  const state = useOnlookState();
  const blocked = state?.session !== 'local' && state?.updateRequired !== undefined;
  return <>
    <div inert={blocked} aria-hidden={blocked || undefined} style={{ width: '100%', height: '100%', ...(blocked ? { visibility: 'hidden' } : {}) }}>{children}</div>
    {blocked ? <UpdateRequiredDialog /> : null}
  </>;
}
