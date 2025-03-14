import { useProjectsManager } from '@/components/Context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@onlook/ui/accordion';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Separator } from '@onlook/ui/separator';
import { formatCommitDate } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { NoVersions } from './EmptyState/Version';
import { VersionRow, VersionRowType } from './VersionRow';

export const Versions = observer(() => {
    const projectsManager = useProjectsManager();
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
                dateKey = formatCommitDate(commit.timestamp, { includeDate: true });
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
            <div className="flex flex-row items-center justify-between gap-2 px-6 py-4">
                <h2 className="text-lg">Versions</h2>
                {commits && commits.length > 0 ? (
                    <Button
                        variant="outline"
                        className="ml-auto text-sm font-normal bg-background-secondary rounded"
                        size="sm"
                        onClick={handleNewBackup}
                        disabled={projectsManager.versions?.isSaving}
                    >
                        {projectsManager.versions?.isSaving ? (
                            <Icons.Shadow className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Icons.Plus className="h-4 w-4 mr-2" />
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
                                    <AccordionTrigger className="text-base font-normal text-muted-foreground py-4 px-6">
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
                                                        <Separator className="mx-6 w-[calc(100%-theme(spacing.12))] bg-border" />
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
