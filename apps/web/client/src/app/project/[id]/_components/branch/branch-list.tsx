import { useMemo, useState } from 'react';

import type { Branch } from '@onlook/models';
import { DropdownMenuItem, DropdownMenuLabel } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { ScrollArea } from '@onlook/ui/scroll-area';
import { timeAgo } from '@onlook/utility';

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
    showSearch = true,
}: BranchListProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredBranches = useMemo(() => {
        if (!showSearch || !searchQuery) {
            return branches;
        }
        return branches.filter((branch) =>
            branch.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [branches, searchQuery, showSearch]);

    return (
        <>
            <div className="border-b p-1.5 select-none">
                <DropdownMenuLabel>Branches</DropdownMenuLabel>
            </div>
            <ScrollArea className="max-h-[300px]">
                <div className="p-1">
                    {filteredBranches.map((branch) => (
                        <DropdownMenuItem
                            key={branch.id}
                            className="flex cursor-pointer items-center justify-between"
                            onSelect={() => onBranchSwitch(branch.id)}
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                {activeBranch.id === branch.id ? (
                                    <Icons.Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Icons.Branch className="text-muted-foreground h-4 w-4" />
                                )}
                                <span className="truncate font-medium">{branch.name}</span>
                            </div>
                            <span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
                                {timeAgo(branch.updatedAt)}
                                {showSearch ? '' : ' ago'}
                            </span>
                        </DropdownMenuItem>
                    ))}

                    {filteredBranches.length === 0 && searchQuery && showSearch && (
                        <div className="text-muted-foreground py-4 text-center text-sm">
                            No branches found
                        </div>
                    )}

                    {filteredBranches.length === 0 && !showSearch && branches.length === 0 && (
                        <div className="text-muted-foreground py-4 text-center text-sm">
                            No branches found
                        </div>
                    )}
                </div>
            </ScrollArea>
        </>
    );
}
