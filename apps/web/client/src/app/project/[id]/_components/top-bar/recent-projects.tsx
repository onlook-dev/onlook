'use client';

import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { transKeys } from '@/i18n/keys';
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export const RecentProjectsMenu = observer(({ currentProjectId }: {
    currentProjectId: string;
} ) => {
    const router = useRouter();
    const t = useTranslations();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    
    const { data: projects, isLoading: isLoadingProjects } = api.project.list.useQuery();
    
    const recentProjects = projects
        ?.filter(project => project.id !== currentProjectId)
        .slice(0, 3) || [];

    const handleProjectClick = async (projectId: string, projectName: string) => {
        setIsLoading(projectId);
        router.push(`${Routes.PROJECT}/${projectId}`);
    };

    if (isLoadingProjects) {
        return (
            <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                    <div className="flex row center items-center">
                        <Icons.Cube className="mr-2" />
                        {t(transKeys.projects.actions.recentProjects)}
                    </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className='ml-2'>
                    <DropdownMenuItem disabled>
                        <div className="flex row center items-center">
                            <Icons.LoadingSpinner className="mr-2 w-4 h-4 animate-spin" />
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
                    <div className="flex row center items-center">
                        <Icons.Cube className="mr-2" />
                        {t(transKeys.projects.actions.recentProjects)}
                    </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className='ml-2'>
                    <DropdownMenuItem disabled>
                        <div className="flex row center items-center text-muted-foreground">
                            <Icons.Cube className="mr-2" />
                            {t(transKeys.projects.select.empty)}
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push(Routes.PROJECTS)} className="cursor-pointer">
                        <div className="flex row center items-center">
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
                <div className="flex row center items-center">
                    <Icons.Cube className="mr-2" />
                    {t(transKeys.projects.actions.recentProjects)}
                </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48 ml-2">
                {recentProjects.map((project) => (
                    <DropdownMenuItem
                        key={project.id}
                        onClick={() => handleProjectClick(project.id, project.name)}
                        disabled={isLoading === project.id}
                        className="cursor-pointer"
                    >
                        <div className="flex row center items-center group">
                            {isLoading === project.id ? (
                                <Icons.LoadingSpinner className="mr-2 w-4 h-4 animate-spin" />
                            ) : (
                                <Icons.Cube className="mr-2" />
                            )}
                            <span className="truncate max-w-[120px]">
                                {project.name}
                            </span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
});