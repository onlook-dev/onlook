import { useProjectsManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { formatCommitDate, timeAgo } from '@onlook/utility';
import type { ReadCommitResult } from 'isomorphic-git';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

export enum VersionRowType {
    SAVED = 'saved',
    TODAY = 'today',
    PREVIOUS_DAYS = 'previous',
}

export const VersionRow = observer(
    ({ commit, type }: { commit: ReadCommitResult; type: VersionRowType }) => {
        const projectsManager = useProjectsManager();
        const [isDropdownOpen, setIsDropdownOpen] = useState(false);

        const renderDate = () => {
            if (type === VersionRowType.TODAY) {
                return `${timeAgo(new Date(commit.commit.author.timestamp * 1000).toISOString())} ago`;
            }
            return formatCommitDate(commit.commit.author.timestamp, {
                includeDate: type === VersionRowType.PREVIOUS_DAYS,
            });
        };

        return (
            <div
                key={commit.oid}
                className="p-2 grid grid-cols-6 items-center justify-between hover:bg-background-secondary/80 transition-colors rounded group"
            >
                <span className="col-span-4 flex flex-col gap-1">
                    <span>{commit.commit.message || 'Backup'}</span>
                    <span className="text-muted-foreground">
                        {commit.commit.author.name} • {renderDate()}
                    </span>
                </span>
                <span className="col-span-1 text-muted-foreground"></span>
                <div
                    className={cn(
                        'col-span-1 gap-2 flex justify-end group-hover:opacity-100 opacity-0 transition-opacity',
                        isDropdownOpen && 'opacity-100',
                    )}
                >
                    {type === VersionRowType.SAVED ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-background-secondary"
                        >
                            <Icons.BookmarkFilled />
                            <span className="text-muted-foreground">Remove</span>
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-background-secondary"
                        >
                            <Icons.Bookmark />
                            <span className="text-muted-foreground">Save</span>
                        </Button>
                    )}

                    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="bg-background-secondary">
                                <Icons.DotsHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                className="flex items-center"
                                onClick={() => projectsManager.versions?.checkoutCommit(commit.oid)}
                            >
                                <Icons.CounterClockwiseClock className="h-4 w-4 mr-2" />
                                Restore backup
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center" onClick={() => {}}>
                                <Icons.Pencil className="h-4 w-4 mr-2" />
                                Rename backup
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    },
);
