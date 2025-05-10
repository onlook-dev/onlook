'use client';

import { useProjectsManager } from '@/components/store/projects';
import { useEffect } from 'react';
import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';

export default function Page() {
    const projectsManager = useProjectsManager();

    useEffect(() => {
        projectsManager.fetchProjects();
    }, []);

    if (projectsManager.isFetching) {
        return <div>Loading projects...</div>;
    }

    return (
        <div className="w-screen h-screen flex flex-col">
            <TopBar />
            <div className="flex justify-center overflow-hidden w-full h-full">
                <SelectProject />
            </div>
        </div>
    );
}
