import { useProjectsManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import type { ReadCommitResult } from 'isomorphic-git';
import { observer } from 'mobx-react-lite';

export const VersionRow = observer(({ commit }: { commit: ReadCommitResult }) => {
    const projectsManager = useProjectsManager();

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
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
            className="flex items-center justify-between p-3 hover:bg-background-active rounded-lg transition-colors"
        >
            <div className="flex items-center space-x-2">
                <Icons.File className="h-4 w-4" />
                <span>{commit.commit.message || 'Automatic Backup'}</span>
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                    {formatDate(commit.commit.author.timestamp)}
                </span>
                <Button variant="ghost" size="sm" onClick={() => {}}>
                    Preview
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <Icons.DotsHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <div className="flex flex-col gap-1 p-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start"
                                onClick={() => projectsManager.versions?.checkoutCommit(commit.oid)}
                            >
                                <Icons.CounterClockwiseClock className="h-4 w-4 mr-2" />
                                Restore backup
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start"
                                onClick={() => {}}
                            >
                                <Icons.Pencil className="h-4 w-4 mr-2" />
                                Rename backup
                            </Button>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
});
