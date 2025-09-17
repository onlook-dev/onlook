import { useEditorEngine } from "@/components/store/editor";
import { BranchTabValue, LeftPanelTabValue, type Branch } from "@onlook/models";
import {
    DropdownMenuItem
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { useState } from "react";

interface BranchControlsProps {
    branch: Branch;
    onClose?: () => void;
    onForkBranch?: () => void;
    onCreateBlankSandbox?: () => void;
    onManageBranches?: () => void;
}

export function BranchControls({
    branch,
    onClose,
    onForkBranch,
    onCreateBlankSandbox,
    onManageBranches
}: BranchControlsProps) {
    const editorEngine = useEditorEngine();
    const [isForking, setIsForking] = useState(false);
    const [isCreatingBlank, setIsCreatingBlank] = useState(false);

    const handleForkBranch = async () => {
        if (isForking) return;

        try {
            setIsForking(true);
            await editorEngine.branches.forkBranch(branch.id);
            onForkBranch?.();
            onClose?.();
        } catch (error) {
            console.error("Failed to fork branch:", error);
        } finally {
            setIsForking(false);
        }
    };

    const handleCreateBlankSandbox = async () => {
        if (isCreatingBlank) return;

        try {
            setIsCreatingBlank(true);
            await editorEngine.branches.createBlankSandbox();
            onCreateBlankSandbox?.();
            onClose?.();
        } catch (error) {
            console.error("Failed to create blank sandbox:", error);
        } finally {
            setIsCreatingBlank(false);
        }
    };

    const handleManageBranches = () => {
        // Open the branches tab in the left panel
        editorEngine.state.leftPanelTab = LeftPanelTabValue.BRANCHES;
        editorEngine.state.leftPanelLocked = true;
        editorEngine.state.branchTab = BranchTabValue.MANAGE;
        editorEngine.state.manageBranchId = branch.id;
        onManageBranches?.();
        onClose?.();
    };

    return (
        <div className="p-1">
            <DropdownMenuItem
                className="flex items-center gap-2 p-2"
                onSelect={handleForkBranch}
                disabled={isForking}
            >
                {isForking ? (
                    <Icons.LoadingSpinner className="h-4 w-4" />
                ) : (
                    <Icons.Branch className="h-4 w-4" />
                )}
                <span>{isForking ? "Forking..." : "Fork into a new Branch"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
                className="flex items-center gap-2 p-2"
                onSelect={handleManageBranches}
            >
                <Icons.Gear className="h-4 w-4" />
                <span>Manage Branch</span>
            </DropdownMenuItem>
        </div>
    );
}