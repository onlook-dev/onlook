import { useEditorEngine } from "@/components/store/editor";
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { useState } from "react";

interface BranchControlsProps {
    onClose?: () => void;
    onForkBranch?: () => void;
    onCreateBlankSandbox?: () => void;
    onManageBranches?: () => void;
}

export function BranchControls({ 
    onClose, 
    onForkBranch, 
    onCreateBlankSandbox, 
    onManageBranches 
}: BranchControlsProps) {
    const editorEngine = useEditorEngine();
    const [isForking, setIsForking] = useState(false);

    const handleForkBranch = async () => {
        if (isForking) return;
        
        try {
            setIsForking(true);
            await editorEngine.branches.forkBranch();
            onForkBranch?.();
            onClose?.();
        } catch (error) {
            console.error("Failed to fork branch:", error);
        } finally {
            setIsForking(false);
        }
    };

    const handleCreateBlankSandbox = () => {
        // TODO: Implement create blank sandbox functionality
        console.log("Create blank sandbox functionality not yet implemented");
        onCreateBlankSandbox?.();
        onClose?.();
    };

    const handleManageBranches = () => {
        // TODO: Implement manage branches functionality
        console.log("Manage branches functionality not yet implemented");
        onManageBranches?.();
        onClose?.();
    };

    return (
        <>
            <DropdownMenuSeparator />
            <div className="p-1">
                <DropdownMenuItem
                    className="flex items-center gap-2 p-2"
                    onSelect={handleForkBranch}
                    disabled={isForking}
                >
                    {isForking ? (
                        <Icons.LoadingSpinner className="h-4 w-4" />
                    ) : (
                        <Icons.GitBranch className="h-4 w-4" />
                    )}
                    <span>{isForking ? "Forking..." : "Fork into a new Branch"}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                    className="flex items-center gap-2 p-2"
                    onSelect={handleCreateBlankSandbox}
                >
                    <Icons.Plus className="h-4 w-4" />
                    <span>Create blank sandbox</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="flex items-center gap-2 p-2"
                    onSelect={handleManageBranches}
                >
                    <Icons.Gear className="h-4 w-4" />
                    <span>Manage Branches</span>
                </DropdownMenuItem>
            </div>
        </>
    );
}