import { useEditorEngine } from '@/components/store/editor';
import type { Frame } from '@onlook/models';
import { toast } from '@onlook/ui/sonner';
import { useEffect, useState } from 'react';

const SANDBOX_TIMEOUT_MS = 30000;

export function useSandboxTimeout(frame: Frame, onTimeout: () => void) {
    const editorEngine = useEditorEngine();
    const [hasTimedOut, setHasTimedOut] = useState(false);

    const branchData = editorEngine.branches.getBranchDataById(frame.branchId);
    const isConnecting = branchData?.sandbox?.session?.isConnecting ?? false;

    useEffect(() => {
        if (!isConnecting) {
            setHasTimedOut(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            const currentBranchData = editorEngine.branches.getBranchDataById(frame.branchId);
            const stillConnecting = currentBranchData?.sandbox?.session?.isConnecting ?? false;

            if (stillConnecting) {
                console.log(`[Frame ${frame.id}] Sandbox connection timeout after ${SANDBOX_TIMEOUT_MS}ms`);
                toast.info('Connection slow, retrying...', {
                    description: `Reconnecting to ${currentBranchData?.branch?.name}...`,
                });
                setHasTimedOut(true);
                onTimeout();
            }
        }, SANDBOX_TIMEOUT_MS);

        return () => clearTimeout(timeoutId);
    }, [isConnecting, frame.branchId, frame.id, onTimeout, editorEngine]);

    return { hasTimedOut, isConnecting };
}
