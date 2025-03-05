import { useProjectsManager } from '@/components/Context';
import type { GitCommit } from '@onlook/git';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { cn } from '@onlook/ui/utils';
import { formatCommitDate, timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';

export enum VersionRowType {
    SAVED = 'saved',
    TODAY = 'today',
    PREVIOUS_DAYS = 'previous',
}

export const VersionRow = observer(
    ({
        commit,
        type,
        autoRename = false,
    }: {
        commit: GitCommit;
        type: VersionRowType;
        autoRename?: boolean;
    }) => {
        const projectsManager = useProjectsManager();
        const inputRef = useRef<HTMLInputElement>(null);
        const [isDropdownOpen, setIsDropdownOpen] = useState(false);
        const [isRenaming, setIsRenaming] = useState(autoRename);
        const [commitDisplayName, setCommitDisplayName] = useState(
            commit.displayName || commit.message || 'Backup',
        );

        useEffect(() => {
            if (autoRename) {
                startRenaming();
            }
        }, [autoRename]);

        const renderDate = () => {
            if (type === VersionRowType.TODAY) {
                return `${timeAgo(new Date(commit.timestamp * 1000).toISOString())} ago`;
            }
            return formatCommitDate(commit.timestamp, {
                includeDate: type === VersionRowType.SAVED,
            });
        };

        const updateCommitDisplayName = (name: string) => {
            projectsManager.versions?.renameCommit(commit.oid, name);
        };

        const startRenaming = () => {
            setIsRenaming(true);
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
                console.log('Focused');
            }, 200);
        };

        const finishRenaming = () => {
            updateCommitDisplayName(commitDisplayName);
            setIsRenaming(false);
        };

        return (
            <div
                key={commit.oid}
                className="p-2 grid grid-cols-6 items-center justify-between hover:bg-background-secondary/80 transition-colors rounded group"
            >
                <span className="col-span-4 flex flex-col gap-1">
                    {isRenaming ? (
                        <Input
                            ref={inputRef}
                            value={commitDisplayName}
                            onChange={(e) => setCommitDisplayName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                    e.currentTarget.blur();
                                }
                            }}
                            onBlur={finishRenaming}
                            className="p-0 border-none bg-none"
                        />
                    ) : (
                        <span>{commit.displayName || commit.message || 'Backup'}</span>
                    )}
                    <span className="text-muted-foreground">
                        {commit.author.name} • {renderDate()}
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
                            onClick={() => projectsManager.versions?.removeSavedCommit(commit)}
                        >
                            <Icons.BookmarkFilled />
                            <span className="text-muted-foreground">Remove</span>
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-background-secondary hidden"
                            onClick={() => projectsManager.versions?.saveCommit(commit)}
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
                                onClick={() => projectsManager.versions?.checkoutCommit(commit)}
                            >
                                <Icons.CounterClockwiseClock className="h-4 w-4 mr-2" />
                                Restore backup
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center" onClick={startRenaming}>
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
