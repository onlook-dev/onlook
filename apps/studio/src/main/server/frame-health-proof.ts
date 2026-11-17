import { proofSwitchOn } from '../diagnostics/gate.js';
import type { ServerHost } from './index.js';

interface FrameHealthProofHook {
  watch(input: { port: number; workspacePath: string }): void;
}

type ProofGlobal = typeof globalThis & {
  __studioFrameHealthProof?: FrameHealthProofHook;
};

export function installFrameHealthProofHook(host: () => Pick<ServerHost, 'openProject' | 'report'> | undefined): void {
  if (!proofSwitchOn('STUDIO_FRAME_HEALTH_PROOF')) return;
  (globalThis as ProofGlobal).__studioFrameHealthProof = {
    watch: ({ port, workspacePath }) => {
      if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error('frame-health proof supplied an invalid port');
      }
      if (workspacePath.length === 0) {
        throw new Error('frame-health proof supplied an empty workspace');
      }
      removeFrameHealthProofHook();
      const book = host();
      void book?.openProject(workspacePath).then(() => book.report(workspacePath, workspacePath, port));
    },
  };
}

export function removeFrameHealthProofHook(): void {
  delete (globalThis as ProofGlobal).__studioFrameHealthProof;
}
