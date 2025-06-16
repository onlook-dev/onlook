import { useProjectManager } from '@/components/store/project';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@onlook/ui/accordion';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { NoVersions } from './empty-state/version';
// import { NoVersions } from './EmptyState/Version';
// import { VersionRow, VersionRowType } from './VersionRow';

export const Versions = observer(() => {
    const projectsManager = useProjectManager();
    const commits = projectsManager.versions?.commits;
    const [commitToRename, setCommitToRename] = useState<string | null>(null);

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
            acc[dateKey].push(commit);
            return acc;
        },
        {} as Record<string, typeof commits>,
    );

    const handleNewBackup = async () => {
        const res = await projectsManager.versions?.createCommit();
        if (!res?.success) {
            console.error('Failed to create commit. Reason code:', res?.errorReason);
            return;
        }
        const latestCommit = projectsManager.versions?.latestCommit;
        if (!latestCommit) {
            console.error('No latest commit found');
            return;
        }
        setCommitToRename(latestCommit.oid);
    };

    return (
        <div className="flex flex-col text-sm">
            <div className="flex flex-row items-center justify-between gap-2 px-6 py-6">
                <h2 className="text-lg">Versions</h2>
                {commits && commits.length > 0 ? (
                    <Button
                        variant="outline"
                        className="bg-background-secondary ml-auto rounded text-sm font-normal"
                        size="sm"
                        onClick={handleNewBackup}
                        disabled={projectsManager.versions?.isSaving}
                    >
                        {projectsManager.versions?.isSaving ? (
                            <Icons.Shadow className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Icons.Plus className="mr-2 h-4 w-4" />
                        )}
                        {projectsManager.versions?.isSaving ? 'Saving...' : 'New backup'}
                    </Button>
                ) : null}
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