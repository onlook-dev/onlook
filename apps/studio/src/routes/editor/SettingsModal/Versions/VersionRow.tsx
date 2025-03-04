import { useProjectsManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { timeAgo } from '@onlook/utility';
import type { ReadCommitResult } from 'isomorphic-git';
import { observer } from 'mobx-react-lite';

export enum VersionRowType {
    SAVED = 'saved',
    TODAY = 'today',
    PREVIOUS_DAYS = 'previous',
}

export const VersionRow = observer(
    ({ commit, type }: { commit: ReadCommitResult; type: VersionRowType }) => {
        const projectsManager = useProjectsManager();

        const formatDate = (timestamp: number) => {
            const date = new Date(timestamp * 1000);

            if (type === VersionRowType.TODAY) {
                return `${timeAgo(date.toISOString())} ago`;
            }

            if (type === VersionRowType.PREVIOUS_DAYS) {
                return date.toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                });
            }

            return date.toLocaleString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                month: 'numeric',
                day: 'numeric',
                year: '2-digit',
            });
        };

        return (
            <div
                key={commit.oid}
                className="p-1 grid grid-cols-6 items-center justify-between hover:bg-background-secondary transition-colors rounded"
            >
                <div className="col-span-4 flex items-center">
                    <Button variant="ghost" size="icon">
                        {type === VersionRowType.SAVED ? (
                            <Icons.BookmarkFilled />
                        ) : (
                            <Icons.Bookmark />
                        )}
                    </Button>
                    <span>{commit.commit.message || 'Backup'}</span>
                </div>
                <span className="col-span-1 text-muted-foreground">
                    {formatDate(commit.commit.author.timestamp)}
                </span>
                <div className="col-span-1 flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
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
