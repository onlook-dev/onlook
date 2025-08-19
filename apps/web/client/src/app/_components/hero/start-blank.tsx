'use client';

import { useAuthContext } from '@/app/auth/auth-context';
import { api } from '@/trpc/react';
import { LocalForageKeys, Routes } from '@/utils/constants';
import { SandboxTemplates, Templates } from '@onlook/constants';
import type { User } from '@onlook/models';
import { Icons } from '@onlook/ui/icons/index';
import localforage from 'localforage';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function StartBlank({
    user,
    isCreatingProject,
    setIsCreatingProject,
}: {
    user: User | null,
    isCreatingProject: boolean,
    setIsCreatingProject: (isCreatingProject: boolean) => void,
}) {
    const { mutateAsync: forkSandbox } = api.sandbox.fork.useMutation();
    const { mutateAsync: createProject } = api.project.create.useMutation();
    const { setIsAuthModalOpen } = useAuthContext();
    const router = useRouter();

    const handleStartBlankProject = async () => {
        if (!user?.id) {
            // Store the return URL and open auth modal
            localforage.setItem(LocalForageKeys.RETURN_URL, window.location.pathname);
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
                    sandboxId,
                    sandboxUrl: previewUrl,
                    description: 'Your new blank project',
                    tags: ['blank'],
                },
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
                    description: 'Please try again in a few moments. Our servers may be experiencing high load.',
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
            className="text-sm text-foreground-secondary hover:text-foreground transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-foreground-secondary"
        >
            {isCreatingProject ? (
                <Icons.LoadingSpinner className="w-4 h-4 animate-spin" />
            ) : (
                <Icons.File className="w-4 h-4" />
            )}
            Start a Blank Project
        </button>
    )
}