import { useEditorEngine } from '@/components/store/editor';
import { useProjectManager } from '@/components/store/project';
import type { GitCommit } from '@onlook/git';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { toast } from '@onlook/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';

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
        onRename,
    }: {
        commit: GitCommit;
        type: VersionRowType;
        autoRename?: boolean;
        onRename?: () => void;
    }) => {
        const projectsManager = useProjectManager();
        const editorEngine = useEditorEngine();
        const inputRef = useRef<HTMLInputElement>(null);
        const [isRenaming, setIsRenaming] = useState(autoRename);
        const [commitDisplayName, setCommitDisplayName] = useState(
            commit.displayName ?? commit.message ?? 'Backup',
        );
        const [isCheckingOut, setIsCheckingOut] = useState(false);
        const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);

        useEffect(() => {
            if (autoRename) {
                startRenaming();
            }
        }, [autoRename]);

        useEffect(() => {
            if (isCheckoutSuccess) {
                setTimeout(() => {
                    setIsCheckoutSuccess(false);
                }, 1000);
            }
        }, [isCheckoutSuccess]);

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
            }, 100);
        };

        const finishRenaming = () => {
            updateCommitDisplayName(commitDisplayName);
            setIsRenaming(false);
            onRename?.();
        };

        const handleCheckout = async () => {
            setIsCheckingOut(true);
            const success = await projectsManager.versions?.checkoutCommit(commit);
            setIsCheckingOut(false);
            setIsCheckoutSuccess(success ?? false);

            if (!success) {
                console.error('Failed to checkout commit', commit.displayName || commit.message);
                toast.error('Failed to restore');
                return;
            }
            setTimeout(() => {
                editorEngine.state.settingsOpen = false;
            }, 1000);
        };

        return (
            <div
                key={commit.oid}
                className="py-4 px-6 grid grid-cols-6 items-center justify-between hover:bg-background-secondary/80 transition-colors group"
            >
                <span className="col-span-4 flex flex-col gap-0.5">
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
                            className="p-0 pl-2 h-8 border border-transparent hover:border-border/50 focus-visible:border-primary/10 focus-visible:ring-0 focus-visible:outline-none focus-visible:bg-transparent bg-transparent hover:bg-transparent transition-all duration-100"
                        />
                    ) : (
                        <span>{commit.displayName ?? commit.message ?? 'Backup'}</span>
                    )}
                    <span className="text-muted-foreground font-light">
                        {commit.author.name}{' '}
                        <span className="text-xs mx-0.45 inline-block scale-75">•</span>{' '}
                        {renderDate()}
                    </span>
                </span>
                <span className="col-span-1 text-muted-foreground"></span>
                <div
                    className={cn(
                        'col-span-1 gap-2 flex justify-end group-hover:opacity-100 opacity-0 transition-opacity',
                        (isCheckoutSuccess || isCheckingOut || isRenaming) && 'opacity-100',
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
                    {isCheckoutSuccess ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-background-secondary"
                        >
                            <Icons.Check className="h-4 w-4 text-green-500" />
                            <span className="text-muted-foreground">Restored</span>
                        </Button>
                    ) : (
                        <div className="flex flex-row gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="bg-background-tertiary/70 hover:bg-background-tertiary"
                                        onClick={startRenaming}
                                        disabled={isRenaming || isCheckingOut}
                                    >
                                        <Icons.Pencil className="h-4 w-4 mr-2" />
                                        Rename
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Rename backup for easier identification
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="bg-background-tertiary/70 hover:bg-background-tertiary"
                                        onClick={handleCheckout}
                                        disabled={isCheckingOut}
                                    >
                                        <Icons.CounterClockwiseClock className="h-4 w-4 mr-2" />
                                        {isCheckingOut ? 'Restoring...' : 'Restore'}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Restore project to this version</TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        );
    },
);