import type { Branch } from "@onlook/models";
import {
    DropdownMenuItem,
    DropdownMenuLabel,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { ScrollArea } from "@onlook/ui/scroll-area";
import { timeAgo } from "@onlook/utility";
import { useMemo, useState } from "react";

interface BranchListProps {
    branches: Branch[];
    activeBranch: Branch;
    onBranchSwitch: (branchId: string) => void;
    showSearch?: boolean;
}

export function BranchList({
    branches,
    activeBranch,
    onBranchSwitch,
    showSearch = true
}: BranchListProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredBranches = useMemo(() => {
        if (!showSearch || !searchQuery) {
            return branches;
        }
        return branches.filter(branch =>
            branch.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [branches, searchQuery, showSearch]);

    return (
        <>
            <div className="p-1.5 border-b select-none text-small">
                <DropdownMenuLabel>Branches</DropdownMenuLabel>
            </div>
            <ScrollArea className="max-h-[300px]">
                <div className="p-1">
                    {filteredBranches.map((branch) => (
                        <DropdownMenuItem
                            key={branch.id}
                            className="flex items-center justify-between cursor-pointer"
                            onSelect={() => onBranchSwitch(branch.id)}
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                {activeBranch.id === branch.id ? (
                                    <Icons.Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Icons.Branch className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="truncate font-medium">{branch.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                {timeAgo(branch.updatedAt)}{showSearch ? '' : ' ago'}
                            </span>
                        </DropdownMenuItem>
                    ))}

                    {filteredBranches.length === 0 && searchQuery && showSearch && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            No branches found
                        </div>
                    )}

                    {filteredBranches.length === 0 && !showSearch && branches.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            No branches found
                        </div>
                    )}
                </div>
            </ScrollArea>
        </>
    );
}