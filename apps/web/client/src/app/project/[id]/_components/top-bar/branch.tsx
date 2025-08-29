import { useEditorEngine } from "@/components/store/editor";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { BranchList } from "../shared/branch-list";
import { BranchControls } from "../shared/branch-controls";

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
            console.error("Failed to switch branch:", error);
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm text-foreground-secondary hover:text-foreground flex flex-row items-center gap-2 h-auto px-2 py-1"
                >
                    <Icons.GitBranch className="h-4 w-4" />
                    <span>{activeBranch.name}</span>
                    <Icons.ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[320px] p-0">
                <BranchList
                    branches={allBranches}
                    activeBranch={activeBranch}
                    onBranchSwitch={handleBranchSwitch}
                    showSearch={true}
                />
                <BranchControls onClose={() => setIsOpen(false)} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});