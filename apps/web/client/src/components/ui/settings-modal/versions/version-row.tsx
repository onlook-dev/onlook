import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';

import type { GitCommit } from '@onlook/git';
import { MessageCheckpointType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { toast } from '@onlook/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { formatCommitDate, timeAgo } from '@onlook/utility';

import { useEditorEngine } from '@/components/store/editor';
import { restoreCheckpoint } from '@/components/store/editor/git';
import { useStateManager } from '@/components/store/state';

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
        const editorEngine = useEditorEngine();
        const stateManager = useStateManager();

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
                return `${timeAgo(new Date(commit.timestamp * 1000))} ago`;
            }
            return formatCommitDate(commit.timestamp, {
                includeDate: type === VersionRowType.SAVED,
            });
        };

        const updateCommitDisplayName = async (name: string) => {
            const branchData = editorEngine.branches.activeBranchData;
            if (!branchData) {
                toast.error('No active branch');
                return;
            }

            const result = await branchData.sandbox.gitManager.addCommitNote(commit.oid, name);

            if (!result.success) {
                toast.error('Failed to rename backup');
                editorEngine.posthog.capture('versions_rename_commit_failed', {
                    commit: commit.oid,
                    newName: name,
                    error: result.error,
                });
                return;
            }

            toast.success('Backup renamed successfully!', {
                description: `Renamed to: "${name}"`,
            });

            editorEngine.posthog.capture('versions_rename_commit_success', {
                commit: commit.oid,
                newName: name,
            });
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
            try {
                setIsCheckingOut(true);

                editorEngine.posthog.capture('versions_checkout_commit', {
                    commit: commit.displayName ?? commit.message,
                });

                const checkpoint = {
                    type: MessageCheckpointType.GIT,
                    oid: commit.oid,
                    branchId: editorEngine.branches.activeBranch.id,
                    createdAt: new Date(),
                };

                const result = await restoreCheckpoint(checkpoint, editorEngine);

                setIsCheckingOut(false);

                if (!result.success) {
                    editorEngine.posthog.capture('versions_checkout_commit_failed', {
                        commit: commit.displayName || commit.message,
                        error: result.error,
                    });
                    setIsCheckoutSuccess(false);
                    return;
                }

                editorEngine.posthog.capture('versions_checkout_commit_success', {
                    commit: commit.displayName || commit.message,
                });

                setIsCheckoutSuccess(true);
                setTimeout(() => {
                    stateManager.isSettingsModalOpen = false;
                }, 1000);
            } catch (error) {
                toast.error('Failed to restore backup', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                });
            } finally {
                setIsCheckingOut(false);
            }
        };

        return (
            <div
                key={commit.oid}
                className="hover:bg-background-secondary/80 group grid grid-cols-6 items-center justify-between px-6 py-4 transition-colors"
            >
                <span className="col-span-4 flex flex-col gap-0.5">
                    <div className="flex h-8 items-center">
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
                                className="hover:border-border/50 focus-visible:border-primary/10 -mt-0.5 -ml-[10px] h-8 w-full border border-transparent bg-transparent p-0 pl-2 transition-all duration-100 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:outline-none"
                            />
                        ) : (
                            <span>{commit.displayName ?? commit.message ?? 'Backup'}</span>
                        )}
                    </div>
                    <span className="text-muted-foreground font-light">
                        {commit.author.name}{' '}
                        <span className="mx-0.45 inline-block scale-75 text-xs">•</span>{' '}
                        {renderDate()}
                    </span>
                </span>
                <span className="text-muted-foreground col-span-1"></span>
                <div
                    className={cn(
                        'col-span-1 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100',
                        (isCheckoutSuccess || isCheckingOut || isRenaming) && 'opacity-100',
                    )}
                >
                    {isCheckoutSuccess ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-background-secondary gap-2"
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
                                        <Icons.Pencil className="mr-2 h-4 w-4" />
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
                                        <Icons.CounterClockwiseClock className="mr-2 h-4 w-4" />
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
