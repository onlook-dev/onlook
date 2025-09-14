'use client';

import { useAuthContext } from '@/app/auth/auth-context';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { LocalForageKeys, Routes } from '@/utils/constants';
import { SandboxTemplates, Templates } from '@onlook/constants';
import {
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import localforage from 'localforage';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export const NewProjectMenu = observer(() => {
    const editorEngine = useEditorEngine();
    const { data: user } = api.user.get.useQuery();
    const { mutateAsync: forkSandbox } = api.sandbox.fork.useMutation();
    const { mutateAsync: createProject } = api.project.create.useMutation();
    const { setIsAuthModalOpen } = useAuthContext();
    const t = useTranslations();
    const router = useRouter();
    const [isCreatingProject, setIsCreatingProject] = useState(false);

    const handleStartBlankProject = async () => {
        if (!user?.id) {
            // Store the return URL and open auth modal
            localforage.setItem(LocalForageKeys.RETURN_URL, window.location.pathname);
            setIsAuthModalOpen(true);
            return;
        }

        setIsCreatingProject(true);
        try {
            // Capture screenshot of current project before cleanup
            try {
                editorEngine.screenshot.captureScreenshot();
            } catch (error) {
                console.error('Failed to capture screenshot:', error);
            }

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
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
                <div className="flex row center items-center">
                    <Icons.Plus className="mr-2" />
                    {t(transKeys.projects.actions.newProject)}
                </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48 ml-2">
                <DropdownMenuItem
                    onClick={() => router.push(Routes.HOME)}
                    className="cursor-pointer"
                >
                    <div className="flex row center items-center group">
                        <Icons.Plus className="mr-2" />
                        {t(transKeys.projects.actions.newProject)}
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={handleStartBlankProject}
                    disabled={isCreatingProject}
                    className="cursor-pointer"
                >
                    <div className="flex row center items-center group">
                        {isCreatingProject ? (
                            <Icons.LoadingSpinner className="mr-2 animate-spin" />
                        ) : (
                            <Icons.FilePlus className="mr-2" />
                        )}
                        {t(transKeys.projects.actions.blankProject)}
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(Routes.IMPORT_PROJECT)}>
                    <div className="flex row center items-center group">
                        <Icons.Upload className="mr-2" />
                        {t(transKeys.projects.actions.import)}
                    </div>
                </DropdownMenuItem>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
});
