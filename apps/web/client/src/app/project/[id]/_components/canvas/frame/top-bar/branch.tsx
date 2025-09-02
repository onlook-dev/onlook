import { useEditorEngine } from "@/components/store/editor";
import type { Branch, Frame } from "@onlook/models";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { BranchControls } from "../../../branch/branch-controls";
import { BranchList } from "../../../branch/branch-list";
import { HoverOnlyTooltip } from "../../../editor-bar/hover-tooltip";

interface BranchDisplayProps {
    frame: Frame;
    activeBranch?: Branch;
}

export const BranchDisplay = observer(({ frame, activeBranch: propActiveBranch }: BranchDisplayProps) => {
    const editorEngine = useEditorEngine();
    const frameBranch = editorEngine.branches.getBranchById(frame.branchId);
    const activeBranch = propActiveBranch || frameBranch;
    const [isOpen, setIsOpen] = useState(false);
    const allBranches = editorEngine.branches.allBranches;

    if (!activeBranch) {
        return null;
    }

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
            <HoverOnlyTooltip content="Branch" side="top" className="mb-1" hideArrow>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs hover:bg-background-secondary"
                    >
                        <Icons.GitBranch />
                        <span className="max-w-24 truncate">
                            {activeBranch.name}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent align="start" className="w-[320px] p-0">
                <BranchList
                    branches={allBranches}
                    activeBranch={activeBranch}
                    onBranchSwitch={handleBranchSwitch}
                    showSearch={false}
                />
                <BranchControls onClose={() => setIsOpen(false)} />
            </DropdownMenuContent>
        </DropdownMenu >
    );
});