import { useEditorEngine } from '@/components/store/editor';
import { BranchTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { BranchManagement } from './branch-management';


export const BranchesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { branches } = editorEngine;
    const [hoveredBranchId, setHoveredBranchId] = useState<string | null>(null);

    const handleBranchSwitch = async (branchId: string) => {
        if (branchId === branches.activeBranch.id) return;

        try {
            // Find a frame that belongs to this branch
            const branchFrame = editorEngine.frames.getAll().find(frameData => frameData.frame.branchId === branchId);
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

    if (editorEngine.state.branchTab === BranchTabValue.MANAGE && editorEngine.state.manageBranchId) {
        const manageBranch = branches.allBranches.find(b => b.id === editorEngine.state.manageBranchId);
        if (manageBranch) {
            return <BranchManagement branch={manageBranch} />;
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm">Branches</h2>
                    <span className="text-xs text-muted-foreground">({branches.allBranches.length})</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="p-2 space-y-1">
                    {branches.allBranches.map((branch) => {
                        const isActive = branch.id === branches.activeBranch.id;
                        const isHovered = hoveredBranchId === branch.id;

                        return (
                            <div
                                key={branch.id}
                                className={cn(
                                    "group relative flex items-center gap-3 p-1 px-2 rounded-lg cursor-pointer transition-colors border",
                                    isActive
                                        ? "bg-accent text-foreground border-border"
                                        : "border-transparent hover:bg-accent/50 text-foreground-secondary hover:text-foreground"
                                )}
                                onClick={() => handleBranchSwitch(branch.id)}
                                onMouseEnter={() => setHoveredBranchId(branch.id)}
                                onMouseLeave={() => setHoveredBranchId(null)}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {isActive ? (
                                        <Icons.CheckCircled className="w-4 h-4 text-teal-400 flex-shrink-0" />
                                    ) : (
                                        <Icons.Branch className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="font-medium text-sm truncate">
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
                                        className="h-8 w-8 p-2 hover:bg-background opacity-50 hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleManageBranch(branch.id);
                                        }}
                                        title="Manage branch"
                                    >
                                        <Icons.Gear className="w-3 h-3" />
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