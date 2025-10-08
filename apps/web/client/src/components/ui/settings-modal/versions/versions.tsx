import { useEditorEngine } from '@/components/store/editor';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@onlook/ui/accordion';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { Separator } from '@onlook/ui/separator';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { NoVersions } from './empty-state/version';
import { VersionRow, VersionRowType } from './version-row';

export const Versions = observer(() => {
    const editorEngine = useEditorEngine();
    const [commitToRename, setCommitToRename] = useState<string | null>(null);
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const selectedBranchId = editorEngine.branches.activeBranch.id;
    const branchData = editorEngine.branches.getBranchDataById(selectedBranchId);
    const gitManager = branchData?.sandbox.gitManager;
    const commits = gitManager?.commits;
    const isLoadingCommits = gitManager?.isLoadingCommits;

    // Group commits by date
    const groupedCommits = commits?.reduce(
        (acc, commit) => {
            const date = new Date(commit.timestamp * 1000);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let dateKey: string;
            if (date.toDateString() === today.toDateString()) {
                dateKey = 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateKey = 'Yesterday';
            } else {
                // Format the date in a more human-readable way
                dateKey = date.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                });
            }

            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey]?.push(commit);
            return acc;
        },
        {} as Record<string, typeof commits>,
    );

    const handleNewBackup = async () => {
        try {
            setIsCreatingBackup(true);
            if (!gitManager) {
                toast.error('Git not initialized');
                return;
            }

            const result = await gitManager.createCommit();
            if (!result.success) {
                toast.error('Failed to create backup', {
                    description: result.error || 'Unknown error',
                });
                return;
            }

            toast.success('Backup created successfully!');
            editorEngine.posthog.capture('versions_create_commit_success');

            const latestCommit = gitManager.commits?.[0];
            if (!latestCommit) {
                console.error('No latest commit found');
                return;
            }
            setCommitToRename(latestCommit.oid);
        } catch (error) {
            toast.error('Failed to create backup', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsCreatingBackup(false);
        }
    };

    return (
        <div className="flex flex-col text-sm">
            <div className="flex flex-row justify-center items-center gap-3 px-6 py-6">
                <h2 className="text-lg">Backup Versions</h2>

                {isLoadingCommits && (
                    <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                )}

                {/* Branch selector */}
                <Select value={selectedBranchId} onValueChange={(value) => { editorEngine.branches.switchToBranch(value); }}>
                    <SelectTrigger className="min-w-38 ml-auto">
                        <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                        {editorEngine.branches.allBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {gitManager && (
                    <Button
                        variant="outline"
                        className="bg-background-secondary rounded text-sm font-normal "
                        onClick={handleNewBackup}
                        disabled={isLoadingCommits || isCreatingBackup}
                    >
                        {isCreatingBackup ? (
                            <Icons.LoadingSpinner className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Icons.Plus className="mr-2 h-4 w-4" />
                        )}
                        New backup
                    </Button>
                )}
            </div>
            <Separator />

            {commits && commits.length > 0 ? (
                <div className="flex flex-col gap-2">
                    <Accordion type="multiple" defaultValue={Object.keys(groupedCommits || {})}>
                        {groupedCommits &&
                            Object.entries(groupedCommits).map(([date, dateCommits]) => (
                                <AccordionItem key={date} value={date}>
                                    <AccordionTrigger className="text-muted-foreground px-6 py-4 text-base font-normal">
                                        {date}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="flex flex-col">
                                            {dateCommits.map((commit, index) => (
                                                <React.Fragment key={commit.oid}>
                                                    <VersionRow
                                                        commit={commit}
                                                        type={
                                                            date === 'Today'
                                                                ? VersionRowType.TODAY
                                                                : VersionRowType.PREVIOUS_DAYS
                                                        }
                                                        autoRename={commit.oid === commitToRename}
                                                        onRename={() => setCommitToRename(null)}
                                                    />
                                                    {index < dateCommits.length - 1 && (
                                                        <Separator className="bg-border mx-6 w-[calc(100%-theme(spacing.12))]" />
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                    </Accordion>
                </div>
            ) : (
                <NoVersions />
            )}
        </div>
    );
});