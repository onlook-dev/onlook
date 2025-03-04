import { invokeMainChannel } from '@/lib/utils';
import { GitChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Input } from '@onlook/ui/input';
import { timeAgo } from '@onlook/utility';
import type { ReadCommitResult } from 'isomorphic-git';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

export const VersionsTab = observer(() => {
    const [commits, setCommits] = useState<ReadCommitResult[] | null>(null);
    const [currentCommit, setCurrentCommit] = useState<string | null>(null);
    const [commitMessage, setCommitMessage] = useState<string>('');

    const saveCommit = async () => {
        await invokeMainChannel(GitChannels.ADD_ALL, { repoPath: 'test' });
        await invokeMainChannel(GitChannels.COMMIT, { repoPath: 'test', message: commitMessage });
        await listCommits();
        await getCurrentCommit();
    };

    const listCommits = async () => {
        const commits: ReadCommitResult[] | null = await invokeMainChannel(
            GitChannels.LIST_COMMITS,
            { repoPath: 'test' },
        );
        console.log(commits);
        if (!commits) {
            return setCommits([]);
        }
        setCommits(commits);
    };

    const getCurrentCommit = async () => {
        const commit: string | null = await invokeMainChannel(GitChannels.GET_CURRENT_COMMIT, {
            repoPath: 'test',
        });
        console.log(commit);
        setCurrentCommit(commit);
    };

    const checkoutCommit = async (commit: string) => {
        await invokeMainChannel(GitChannels.CHECKOUT, { repoPath: 'test', commit: commit });
        await listCommits();
        setCurrentCommit(commit);
    };

    return (
        <div>
            <h1>Versions</h1>
            <Input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
            />
            <div className="flex flex-row gap-2">
                <Button
                    onClick={() => {
                        invokeMainChannel(GitChannels.INIT_REPO, { repoPath: 'test' });
                    }}
                >
                    Init
                </Button>
                <Button onClick={saveCommit}>Commit</Button>
                <Button onClick={listCommits}>List Commits</Button>
            </div>
            <div className="flex flex-col gap-2">
                {commits?.map((commit) => (
                    <div key={commit.oid} className="grid grid-cols-3 gap-2">
                        <p className="col-span-1 flex flex-row gap-2">
                            {currentCommit === commit.oid && <p className="px-1 text-teal">X</p>}
                            {commit.commit.message}
                        </p>
                        <p className="col-span-1">
                            {timeAgo(new Date(commit.commit.author.timestamp * 1000).toISOString())}{' '}
                            ago
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="col-span-1"
                            onClick={() => {
                                checkoutCommit(commit.oid);
                            }}
                        >
                            Checkout
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
});
