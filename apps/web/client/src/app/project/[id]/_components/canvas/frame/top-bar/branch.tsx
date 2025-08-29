import { useEditorEngine } from "@/components/store/editor";
import type { Frame, Branch } from "@onlook/models";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { BranchList } from "../../../shared/branch-list";
import { BranchControls } from "../../../shared/branch-controls";

interface BranchDisplayProps {
    frame: Frame;
    activeBranch?: Branch;
}

export const BranchDisplay = observer(({ frame, activeBranch: propActiveBranch }: BranchDisplayProps) => {
    const editorEngine = useEditorEngine();
    const frameBranch = editorEngine.branches.getBranchById(frame.branchId);
    const activeBranch = propActiveBranch || frameBranch;
    
    if (!activeBranch) {
        return null;
    }
    
    const allBranches = editorEngine.branches.allBranches;
    const [isOpen, setIsOpen] = useState(false);

    const handleBranchSwitch = async (branchId: string) => {
        try {
            await editorEngine.branches.switchToBranch(branchId);
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to switch branch:", error);
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs hover:bg-background-secondary"
                >
                    <Icons.GitBranch className="h-4 w-4" />
                    <span className="max-w-32 truncate">
                        {activeBranch.name}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[320px] p-0">
                <BranchList
                    branches={allBranches}
                    activeBranch={activeBranch}
                    onBranchSwitch={handleBranchSwitch}
                    showSearch={false}
                />
                <BranchControls onClose={() => setIsOpen(false)} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});