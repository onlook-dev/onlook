'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';

import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';

export default function ImportingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    const repoFullName = searchParams.get('repo');
    const defaultBranch = searchParams.get('branch');
    const cloneUrl = searchParams.get('clone_url');
    const name = searchParams.get('name');
    const description = searchParams.get('description');

    const { data: user } = api.user.get.useQuery();
    const createSandbox = api.sandbox.createFromGitHub.useMutation();
    const createProject = api.project.create.useMutation();

    useEffect(() => {
        if (!repoFullName || !defaultBranch || !cloneUrl || !name || !user?.id) {
            return;
        }

        const importRepo = async () => {
            try {
                // Create sandbox from GitHub
                const sandbox = await createSandbox.mutateAsync({
                    repoUrl: cloneUrl,
                    branch: defaultBranch,
                });

                // Create project
                const project = await createProject.mutateAsync({
                    project: {
                        name: name,
                        description: description ?? 'Imported from GitHub',
                    },
                    userId: user.id,
                    sandboxId: sandbox.sandboxId,
                    sandboxUrl: sandbox.previewUrl,
                });

                if (!project) {
                    throw new Error('Failed to create project');
                }

                // Redirect to project
                router.push(`${Routes.PROJECT}/${project.id}`);
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to import repository';
                setError(errorMessage);
                console.error('Error importing repository:', err);
            }
        };

        void importRepo();
    }, [repoFullName, defaultBranch, cloneUrl, name, description, user?.id]);

    const handleRetry = () => {
        router.push(Routes.IMPORT_GITHUB);
    };

    if (error) {
        return (
            <div className="fixed inset-0">
                <div className="bg-background relative flex h-full w-full items-center justify-center">
                    <Card className="bg-background/30 w-[30rem] backdrop-blur-md">
                        <CardContent className="space-y-6 p-6">
                            <div className="flex flex-col items-center gap-4">
                                <div className="rounded-full bg-red-900/20 p-4">
                                    <Icons.CrossCircled className="h-8 w-8 text-red-500" />
                                </div>
                                <CardTitle className="text-xl font-normal">Import Failed</CardTitle>
                                <CardDescription className="text-center">{error}</CardDescription>
                            </div>
                            <div className="flex justify-center gap-2">
                                <Button onClick={handleRetry} variant="outline">
                                    Back to Selection
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0">
            <div className="bg-background relative flex h-full w-full items-center justify-center">
                <Card className="bg-background/30 w-[30rem] backdrop-blur-md">
                    <CardContent className="space-y-6 p-6">
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-primary/10 rounded-full p-4">
                                <Icons.Shadow className="text-primary h-8 w-8 animate-spin" />
                            </div>
                            <CardTitle className="text-xl font-normal">
                                Importing Repository
                            </CardTitle>
                            <CardDescription className="text-center">
                                {repoFullName ?? 'Setting up your project...'}
                            </CardDescription>
                        </div>
                        <div className="text-muted-foreground text-center text-sm">
                            This may take a minute. Please don't close this page.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
