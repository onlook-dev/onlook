import { useEditorEngine } from '@/components/store/editor';
import { BranchTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import { BranchManagement } from './branch-management';

export const BranchesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { branches } = editorEngine;
    const [hoveredBranchId, setHoveredBranchId] = useState<string | null>(null);
    const [manageBranchId, setManageBranchId] = useState<string | null>(null);

    const handleBranchSwitch = async (branchId: string) => {
        if (branchId === branches.activeBranch.id) return;
        
        try {
            await branches.switchToBranch(branchId);
        } catch (error) {
            console.error('Failed to switch branch:', error);
        }
    };

    const handleManageBranch = (branchId: string) => {
        setManageBranchId(branchId);
        editorEngine.state.branchTab = BranchTabValue.MANAGE;
    };

    const sortedBranches = [...branches.allBranches].sort((a, b) => {
        if (a.id === branches.activeBranch.id) return -1;
        if (b.id === branches.activeBranch.id) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    useEffect(() => {
        if (editorEngine.state.branchTab !== BranchTabValue.MANAGE) {
            setManageBranchId(null);
        }
    }, [editorEngine.state.branchTab]);

    if (editorEngine.state.branchTab === BranchTabValue.MANAGE && manageBranchId) {
        const manageBranch = branches.allBranches.find(b => b.id === manageBranchId);
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
                    {sortedBranches.map((branch) => {
                        const isActive = branch.id === branches.activeBranch.id;
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

                                {isHovered && (
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
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});