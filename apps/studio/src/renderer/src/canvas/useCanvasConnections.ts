import { useEffect } from 'react';
import { useToast } from '@astryxdesign/core/Toast';
import { t } from '@studio/i18n';
import { subscribeToServerState } from '../server/store.js';
import { connectProjectSetup } from '../project-setup/store.js';
import { connectSetupLanding } from '../create/setupProgress.js';
import { connectCanvas } from './connect.js';

export function useServerStateConnection(): void {
  useEffect(() => subscribeToServerState(), []);
}

export function useCanvasDocumentConnection(): void {
  useEffect(() => connectCanvas(), []);
}

export function useProjectSetupConnection(): void {
  const showToast = useToast();
  useEffect(() => connectProjectSetup(undefined, (move) => {
    showToast({ body: t('projectSetup.portMoved', move), type: 'info' });
  }), [showToast]);
}

export function useSetupLandingConnection(): void {
  useEffect(() => connectSetupLanding(), []);
}
