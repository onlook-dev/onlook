'use client';

import { useProjectsManager } from '@/components/store/projects';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';

const Page = observer(() => {
    const projectsManager = useProjectsManager();
    useEffect(() => {
        projectsManager.fetchProjects();
    }, []);

    if (projectsManager.isFetching) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center">
                <div className='text-lg'>Loading projects...</div>
            </div>
        )
    }

    return (
        <div className="w-screen h-screen flex flex-col">
            <TopBar />
            <div className="flex justify-center overflow-hidden w-full h-full">
                <SelectProject />
            </div>
        </div>
    );
});


export default Page