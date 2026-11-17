import { useEffect } from 'react';
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
  useEffect(() => connectProjectSetup(), []);
}

export function useSetupLandingConnection(): void {
  useEffect(() => connectSetupLanding(), []);
}
