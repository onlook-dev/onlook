import type { Branch } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { jsonClone } from '@onlook/utility/src/clone';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { z } from 'zod';
import { ClientTool } from '../models/client';

export class ListBranchesTool extends ClientTool {
    static readonly toolName = 'list_branches';
    static readonly description = 'List all available branches in the project';
    static readonly parameters = z.object({});
    static readonly icon = Icons.Branch;

    async handle(_params: unknown, editorEngine: EditorEngine): Promise<{
        branches: Branch[];
        activeBranchId: string | null;
    }> {
        const branches = jsonClone(editorEngine.branches.allBranches)
        return {
            branches,
            activeBranchId: editorEngine.branches.activeBranch?.id || null,
        };
    }

    static getLabel(input?: z.infer<typeof ListBranchesTool.parameters>): string {
        return 'Listing branches';
    }
}