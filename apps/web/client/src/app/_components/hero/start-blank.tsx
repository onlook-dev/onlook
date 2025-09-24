'use client';

import { useRouter } from 'next/navigation';
import localforage from 'localforage';
import { toast } from 'sonner';

import type { User } from '@onlook/models';
import { SandboxTemplates, Templates } from '@onlook/constants';
import { Icons } from '@onlook/ui/icons/index';

import { useAuthContext } from '@/app/auth/auth-context';
import { api } from '@/trpc/react';
import { LocalForageKeys, Routes } from '@/utils/constants';

export function StartBlank({
    user,
    isCreatingProject,
    setIsCreatingProject,
}: {
    user: User | null;
    isCreatingProject: boolean;
    setIsCreatingProject: (isCreatingProject: boolean) => void;
}) {
    const { mutateAsync: forkSandbox } = api.sandbox.fork.useMutation();
    const { mutateAsync: createProject } = api.project.create.useMutation();
    const { setIsAuthModalOpen } = useAuthContext();
    const router = useRouter();

    const handleStartBlankProject = async () => {
        if (!user?.id) {
            // Store the return URL and open auth modal
            await localforage.setItem(LocalForageKeys.RETURN_URL, window.location.pathname);
            setIsAuthModalOpen(true);
            return;
        }

        setIsCreatingProject(true);
        try {
            // Create a blank project using the BLANK template
            const { sandboxId, previewUrl } = await forkSandbox({
                sandbox: SandboxTemplates[Templates.EMPTY_NEXTJS],
                config: {
                    title: `Blank project - ${user.id}`,
                    tags: ['blank', user.id],
                },
            });

            const newProject = await createProject({
                project: {
                    name: 'New Project',
                    description: 'Your new blank project',
                    tags: ['blank'],
                },
                sandboxId,
                sandboxUrl: previewUrl,
                userId: user.id,
            });

            if (newProject) {
                router.push(`${Routes.PROJECT}/${newProject.id}`);
            }
        } catch (error) {
            console.error('Error creating blank project:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (errorMessage.includes('502') || errorMessage.includes('sandbox')) {
                toast.error('Sandbox service temporarily unavailable', {
                    description:
                        'Please try again in a few moments. Our servers may be experiencing high load.',
                });
            } else {
                toast.error('Failed to create project', {
                    description: errorMessage,
                });
            }
        } finally {
            setIsCreatingProject(false);
        }
    };

    return (
        <button
            onClick={handleStartBlankProject}
            disabled={isCreatingProject}
            className="text-foreground-secondary hover:text-foreground disabled:hover:text-foreground-secondary flex items-center gap-2 text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {isCreatingProject ? (
                <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
            ) : (
                <Icons.File className="h-4 w-4" />
            )}
            Start a Blank Project
        </button>
    );
}
