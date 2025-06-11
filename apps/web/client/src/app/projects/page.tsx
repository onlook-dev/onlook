'use client';

import { useProjectsManager } from '@/components/store/projects';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';
import { ProjectTabs } from '@/components/store/projects/manager';
import { ImportProject } from './_components/create/new-project';

const Page = observer(() => {
    const projectsManager = useProjectsManager();

    useEffect(() => {
        projectsManager.fetchProjects();
    }, []);

    if (projectsManager.isFetching) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Icons.Shadow className="h-6 w-6 animate-spin text-foreground-primary" />
                    <div className='text-lg text-foreground-secondary'>Loading projects...</div>
                </div>
            </div>
        )
    }

    const renderTab = () => {
        switch (projectsManager.projectsTab) {
            case ProjectTabs.PROJECTS:
                return <SelectProject />;
            case ProjectTabs.IMPORT_PROJECT:
                return <ImportProject />;
        }
    }

    return (
        <div className="w-screen h-screen flex flex-col">
            <TopBar />
            <div className="flex justify-center overflow-hidden w-full h-full">
                {renderTab()}
            </div>
        </div>
    );
});


export default Page
