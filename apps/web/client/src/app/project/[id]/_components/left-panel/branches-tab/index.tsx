import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { BranchTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { timeAgo } from '@onlook/utility';

import { useEditorEngine } from '@/components/store/editor';
import { BranchManagement } from './branch-management';

export const BranchesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { branches } = editorEngine;
    const [hoveredBranchId, setHoveredBranchId] = useState<string | null>(null);

    const handleBranchSwitch = async (branchId: string) => {
        if (branchId === branches.activeBranch.id) return;

        try {
            // Find a frame that belongs to this branch
            const branchFrame = editorEngine.frames
                .getAll()
                .find((frameData) => frameData.frame.branchId === branchId);
            if (branchFrame) {
                // Select the frame, which will trigger the reaction to update the active branch
                editorEngine.frames.select([branchFrame.frame]);
            } else {
                // Fallback to direct branch switch if no frames found
                await branches.switchToBranch(branchId);
            }
        } catch (error) {
            console.error('Failed to switch branch:', error);
        }
    };

    const handleManageBranch = (branchId: string) => {
        editorEngine.state.manageBranchId = branchId;
        editorEngine.state.branchTab = BranchTabValue.MANAGE;
    };

    if (
        editorEngine.state.branchTab === BranchTabValue.MANAGE &&
        editorEngine.state.manageBranchId
    ) {
        const manageBranch = branches.allBranches.find(
            (b) => b.id === editorEngine.state.manageBranchId,
        );
        if (manageBranch) {
            return <BranchManagement branch={manageBranch} />;
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm">Branches</h2>
                    <span className="text-muted-foreground text-xs">
                        ({branches.allBranches.length})
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="space-y-1 p-2">
                    {branches.allBranches.map((branch) => {
                        const isActive = branch.id === branches.activeBranch.id;
                        const isHovered = hoveredBranchId === branch.id;

                        return (
                            <div
                                key={branch.id}
                                className={cn(
                                    'group relative flex cursor-pointer items-center gap-3 rounded-lg border p-1 px-2 transition-colors',
                                    isActive
                                        ? 'bg-accent text-foreground border-border'
                                        : 'hover:bg-accent/50 text-foreground-secondary hover:text-foreground border-transparent',
                                )}
                                onClick={() => handleBranchSwitch(branch.id)}
                                onMouseEnter={() => setHoveredBranchId(branch.id)}
                                onMouseLeave={() => setHoveredBranchId(null)}
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                    {isActive ? (
                                        <Icons.CheckCircled className="h-4 w-4 flex-shrink-0 text-teal-400" />
                                    ) : (
                                        <Icons.Branch className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="truncate text-sm font-medium">
                                            {branch.name}
                                        </div>
                                        <div className="text-mini text-muted-foreground mb-1 truncate">
                                            {timeAgo(branch.updatedAt)}
                                        </div>
                                    </div>
                                </div>

                                {isHovered && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="hover:bg-background h-8 w-8 p-2 opacity-50 transition-opacity hover:opacity-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleManageBranch(branch.id);
                                        }}
                                        title="Manage branch"
                                    >
                                        <Icons.Gear className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
