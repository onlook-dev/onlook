'use client';

import { useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { api } from '@/trpc/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@onlook/ui/dialog';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';

interface ApplyFixPackButtonProps {
    fixPackId: string;
    fixPackTitle: string;
    onApplySuccess?: (applyRunId: string) => void;
}

export function ApplyFixPackButton({
    fixPackId,
    fixPackTitle,
    onApplySuccess,
}: ApplyFixPackButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [repoOwner, setRepoOwner] = useState('');
    const [repoName, setRepoName] = useState('');

    const applyMutation = api.fixPack.apply.useMutation();

    const handleApply = async () => {
        if (!repoOwner || !repoName) {
            toast.error('Please enter both repository owner and name');
            return;
        }

        try {
            const result = await applyMutation.mutateAsync({
                fixPackId,
                repoOwner: repoOwner.trim(),
                repoName: repoName.trim(),
            });

            toast.success('Fix pack queued for application!', {
                description: 'Creating GitHub PR...',
            });

            setIsOpen(false);

            if (onApplySuccess) {
                onApplySuccess(result.applyRunId);
            }
        } catch (error: any) {
            toast.error('Failed to apply fix pack', {
                description: error.message,
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="lg">
                    <Icons.GitBranch className="h-4 w-4 mr-2" />
                    Apply to Repository
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Apply Fix Pack to Repository</DialogTitle>
                    <DialogDescription>
                        This will create a GitHub pull request with the changes from "{fixPackTitle}".
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="owner">Repository Owner</Label>
                        <Input
                            id="owner"
                            placeholder="your-username"
                            value={repoOwner}
                            onChange={(e) => setRepoOwner(e.target.value)}
                            disabled={applyMutation.isPending}
                        />
                        <p className="text-xs text-foreground-secondary">
                            Your GitHub username or organization name
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="repo">Repository Name</Label>
                        <Input
                            id="repo"
                            placeholder="my-project"
                            value={repoName}
                            onChange={(e) => setRepoName(e.target.value)}
                            disabled={applyMutation.isPending}
                        />
                        <p className="text-xs text-foreground-secondary">
                            The repository where you want to create the PR
                        </p>
                    </div>

                    <div className="bg-background-secondary border border-border rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-2">What happens next?</h4>
                        <ol className="text-xs text-foreground-secondary space-y-1 list-decimal list-inside">
                            <li>Create a new branch from main</li>
                            <li>Apply the fix pack patches</li>
                            <li>Commit and push changes</li>
                            <li>Open a pull request</li>
                            <li>Run CI checks</li>
                        </ol>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={applyMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleApply} disabled={applyMutation.isPending}>
                        {applyMutation.isPending ? (
                            <>
                                <Icons.Spinner className="h-4 w-4 mr-2 animate-spin" />
                                Creating PR...
                            </>
                        ) : (
                            <>
                                <Icons.GitPullRequest className="h-4 w-4 mr-2" />
                                Create PR
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
