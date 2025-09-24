'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';

import {
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';

export const RecentProjectsMenu = observer(() => {
    const editorEngine = useEditorEngine();
    const currentProjectId = editorEngine.projectId;
    const router = useRouter();
    const t = useTranslations();
    const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

    const { data: projects, isLoading: isLoadingProjects } = api.project.list.useQuery({
        limit: 5,
        excludeProjectId: currentProjectId,
    });

    const recentProjects = projects?.filter((project) => project.id !== currentProjectId) || [];

    const handleProjectClick = async (projectId: string) => {
        setLoadingProjectId(projectId);
        router.push(`${Routes.PROJECT}/${projectId}`);
    };

    if (isLoadingProjects) {
        return (
            <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                    <div className="center flex flex-row items-center">
                        <Icons.Cube className="mr-2" />
                        {t(transKeys.projects.actions.recentProjects)}
                    </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="ml-2">
                    <DropdownMenuItem disabled>
                        <div className="center flex flex-row items-center">
                            <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuSub>
        );
    }

    if (!recentProjects.length) {
        return (
            <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                    <div className="center flex flex-row items-center">
                        <Icons.Cube className="mr-2" />
                        {t(transKeys.projects.actions.recentProjects)}
                    </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="ml-2">
                    <DropdownMenuItem disabled>
                        <div className="center text-muted-foreground flex flex-row items-center">
                            <Icons.Cube className="mr-2" />
                            {t(transKeys.projects.select.empty)}
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => router.push(Routes.PROJECTS)}
                        className="cursor-pointer"
                    >
                        <div className="center flex flex-row items-center">
                            <Icons.Tokens className="mr-2" />
                            {t(transKeys.projects.actions.goToAllProjects)}
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuSub>
        );
    }

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
                <div className="center flex flex-row items-center">
                    <Icons.Cube className="mr-2" />
                    {t(transKeys.projects.actions.recentProjects)}
                </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="ml-2 w-48">
                {recentProjects.map((project) => (
                    <DropdownMenuItem
                        key={project.id}
                        onClick={() => handleProjectClick(project.id)}
                        disabled={loadingProjectId === project.id}
                        className="cursor-pointer"
                    >
                        <div className="center group flex flex-row items-center">
                            {loadingProjectId === project.id ? (
                                <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Icons.Cube className="mr-2" />
                            )}
                            <span className="max-w-[120px] truncate">{project.name}</span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
});
