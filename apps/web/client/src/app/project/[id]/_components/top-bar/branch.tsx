import { useEditorEngine } from "@/components/store/editor";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { Input } from "@onlook/ui/input";
import { ScrollArea } from "@onlook/ui/scroll-area";
import { timeAgo } from "@onlook/utility";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

export const BranchDisplay = observer(() => {
    const editorEngine = useEditorEngine();
    const branch = editorEngine.branches.activeBranch;
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    // Get all branches from branch manager
    const allBranches = useMemo(() => {
        const branches = editorEngine.branches.allBranches;
        // Sort by updatedAt descending
        return branches.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [editorEngine.branches.allBranches]);

    const filteredBranches = useMemo(() =>
        allBranches.filter(b =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [allBranches, searchQuery]
    );

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
                    className="text-sm text-foreground-secondary hover:text-foreground flex flex-row items-center gap-2 h-auto px-2 py-1"
                >
                    <Icons.GitBranch className="h-4 w-4" />
                    <span>{branch.name}</span>
                    <Icons.ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[320px] p-0">
                <div className="p-3 border-b">
                    <DropdownMenuLabel className="text-base font-medium mb-2">Branches</DropdownMenuLabel>
                    <Input
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8"
                    />
                </div>

                <ScrollArea className="max-h-[300px]">
                    <div className="p-1">
                        {filteredBranches.map((b) => (
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

                        {filteredBranches.length === 0 && searchQuery && (
                            <div className="text-sm text-muted-foreground text-center py-4">
                                No branches found
                            </div>
                        )}

                        {filteredBranches.length > 5 && (
                            <div className="text-center py-2">
                                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                                    View 15 more...
                                </Button>
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