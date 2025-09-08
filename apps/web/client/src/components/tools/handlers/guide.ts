import type { EditorEngine } from '@/components/store/editor/engine';
import type { Branch } from '@onlook/models';
import { jsonClone } from '@onlook/utility';

export async function handleReadStyleGuideTool(editorEngine: EditorEngine): Promise<{
    configPath: string;
    cssPath: string;
    configContent: string;
    cssContent: string;
}> {
    const result = await editorEngine.theme.initializeTailwindColorContent();
    if (!result) {
        throw new Error('Style guide files not found');
    }
    return result;
}

export async function handleListBranchesTool(editorEngine: EditorEngine): Promise<{
    branches: Branch[];
    activeBranchId: string | null;
}> {
    const branches = jsonClone(editorEngine.branches.allBranches)
    return {
        branches,
        activeBranchId: editorEngine.branches.activeBranch?.id || null,
    };
}
