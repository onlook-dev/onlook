import { useEditorEngine } from "@/components/store/editor";
import type { Frame } from "@onlook/models";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { ScrollArea } from "@onlook/ui/scroll-area";
import { timeAgo } from "@onlook/utility";
import { observer } from "mobx-react-lite";
import { useState } from "react";

export const BranchDisplay = observer(({ frame }: { frame: Frame }) => {
    const editorEngine = useEditorEngine();
    const branch = editorEngine.branches.getBranchById(frame.branchId);
    if (!branch) {
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

    const handleForkBranch = () => {
        // TODO: Implement fork branch functionality
        console.log("Fork branch functionality not yet implemented");
        setIsOpen(false);
    };

    const handleCreateBlankSandbox = () => {
        // TODO: Implement create blank sandbox functionality
        console.log("Create blank sandbox functionality not yet implemented");
        setIsOpen(false);
    };

    const handleManageBranches = () => {
        // TODO: Implement manage branches functionality
        console.log("Manage branches functionality not yet implemented");
        setIsOpen(false);
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
                        {branch.name}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[320px] p-0">
                <ScrollArea className="max-h-[300px]">
                    <div className="p-1">
                        {allBranches.map((b) => (
                            <DropdownMenuItem
                                key={b.id}
                                className="flex items-center justify-between p-2 cursor-pointer min-h-[40px]"
                                onSelect={() => handleBranchSwitch(b.id)}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {branch.id === b.id ? (
                                        <Icons.Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Icons.GitBranch className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="truncate font-medium">{b.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                    {timeAgo(b.updatedAt)}
                                </span>
                            </DropdownMenuItem>
                        ))}

                        {allBranches.length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-4">
                                No branches found
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DropdownMenuSeparator />
                <div className="p-1">
                    <DropdownMenuItem
                        className="flex items-center gap-2 p-2"
                        onSelect={handleForkBranch}
                    >
                        <Icons.GitBranch className="h-4 w-4" />
                        <span>Fork into a new Branch</span>
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
});