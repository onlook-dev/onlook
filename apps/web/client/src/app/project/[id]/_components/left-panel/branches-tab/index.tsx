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
    const branches = editorEngine.branches.allBranches;
    const activeBranch = editorEngine.branches.activeBranch;
    const [hoveredBranchId, setHoveredBranchId] = useState<string | null>(null);
    const [manageBranchId, setManageBranchId] = useState<string | null>(null);

    const handleBranchSwitch = async (branchId: string) => {
        if (branchId === activeBranch.id) return;

        try {
            await editorEngine.branches.switchToBranch(branchId);
        } catch (error) {
            console.error('Failed to switch branch:', error);
        }
    };

    const handleManageBranch = (branchId: string) => {
        setManageBranchId(branchId);
        editorEngine.state.branchTab = BranchTabValue.MANAGE;
    };

    const sortedBranches = [...branches].sort((a, b) => {
        // Show active branch first, then sort by updated time
        if (a.id === activeBranch.id) return -1;
        if (b.id === activeBranch.id) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // If branch management panel is visible, show it instead of the main content
    if (editorEngine.state.branchTab === BranchTabValue.MANAGE && manageBranchId) {
        const manageBranch = branches.find(b => b.id === manageBranchId);
        if (manageBranch) {
            return (
                <BranchManagement branch={manageBranch} />
            );
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Icons.GitBranch className="w-4 h-4" />
                    <h2 className="text-sm font-medium">Branches</h2>
                    <span className="text-xs text-muted-foreground">({branches.length})</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="p-2 space-y-1">
                    {sortedBranches.map((branch) => {
                        const isActive = branch.id === activeBranch.id;
                        const isHovered = hoveredBranchId === branch.id;

                        return (
                            <div
                                key={branch.id}
                                className={cn(
                                    "group relative flex items-center gap-3 p-1 rounded-lg cursor-pointer transition-colors",
                                    isActive
                                        ? "bg-accent text-foreground border border-border"
                                        : "hover:bg-accent/50 text-foreground-secondary hover:text-foreground"
                                )}
                                onClick={() => handleBranchSwitch(branch.id)}
                                onMouseEnter={() => setHoveredBranchId(branch.id)}
                                onMouseLeave={() => setHoveredBranchId(null)}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {isActive ? (
                                        <Icons.Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    ) : (
                                        <Icons.GitBranch className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium text-sm truncate">
                                            {branch.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {timeAgo(branch.updatedAt)}
                                        </div>
                                    </div>
                                </div>

                                {/* Hover controls */}
                                {isHovered && (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:bg-background"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleManageBranch(branch.id);
                                            }}
                                            title="Manage branch"
                                        >
                                            <Icons.Gear className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});