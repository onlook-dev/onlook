import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

import { useEditorEngine } from '@/components/store/editor';
import { BranchControls } from '../branch/branch-controls';
import { BranchList } from '../branch/branch-list';

export const BranchDisplay = observer(() => {
    const editorEngine = useEditorEngine();
    const activeBranch = editorEngine.branches.activeBranch;
    const allBranches = editorEngine.branches.allBranches;
    const [isOpen, setIsOpen] = useState(false);

    const handleBranchSwitch = async (branchId: string) => {
        try {
            await editorEngine.branches.switchToBranch(branchId);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to switch branch:', error);
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="text-small text-foreground-onlook hover:text-foreground-active group cursor-pointer gap-2 px-0 font-normal hover:!bg-transparent"
                >
                    <Icons.Branch className="h-4 w-4" />
                    <span className="text-small group-hover:text-foreground-active max-w-[60px] cursor-pointer truncate md:max-w-[100px] lg:max-w-[200px]">
                        {activeBranch.name}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[320px] p-0">
                <BranchList
                    branches={allBranches}
                    activeBranch={activeBranch}
                    onBranchSwitch={handleBranchSwitch}
                    showSearch={true}
                />
                <DropdownMenuSeparator />
                <BranchControls branch={activeBranch} onClose={() => setIsOpen(false)} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
