'use client';

import { useProjectsManager } from '@/components/store/projects';
import type { Project } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Carousel } from './carousel';
import { ProjectInfo } from './info';

export const SelectProject = observer(() => {
    const projectsManager = useProjectsManager();
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const projects = projectsManager.projects;

    const sortProjects = (unsortedProjects: Project[]) => {
        return unsortedProjects
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.metadata.updatedAt).getTime() -
                    new Date(a.metadata.updatedAt).getTime(),
            );
    };

    const sortedProjects = sortProjects(projects);

    const handleProjectChange: (index: number) => void = (index: number) => {
        if (currentProjectIndex === index) {
            return;
        }
        setDirection(index > currentProjectIndex ? 1 : -1);
        setCurrentProjectIndex(index);
    };

    if (projectsManager.isFetchingProjects) {
        return <div>Loading projects...</div>;
    }

    return (
        <div className="flex flex-row w-full">
            <div className="w-3/5 h-full">
                <Carousel slides={sortedProjects} onSlideChange={handleProjectChange} />
            </div>
            <div className="w-2/5 flex flex-col justify-center items-start p-4 mr-10 gap-6">
                {projects[currentProjectIndex] && (
                    <ProjectInfo project={projects[currentProjectIndex]} direction={direction} />
                )}
            </div>
        </div>
    );
});
