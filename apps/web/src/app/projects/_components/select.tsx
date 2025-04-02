"use client"

// import { useProjectsManager } from '@/components/Context';
import type { Project } from '@onlook/models/projects';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Carousel from './carousel';
import ProjectInfo from './info';

export const SelectProject = observer(() => {
    const { t } = useTranslation();
    // const projectsManager = useProjectsManager();
    // const [projects, setProjects] = useState<Project[]>(sortProjects(projectsManager.projects));
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    // TODO: remove this
    const mockProjects: Project[] = [{
        id: '1',
        name: 'Project 1',
        folderPath: 'Project 1',
        url: 'https://www.google.com',
        previewImg: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12).toISOString(),
        settings: null,
        commands: null,
        domains: null,
    },
    {
        id: '2',
        name: 'Project 2',
        folderPath: 'Project 2',
        url: 'https://www.google.com',
        previewImg: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        settings: null,
        commands: null,
        domains: null,
    }]

    const sortProjects = (unsortedProjects: Project[]) => {
        return unsortedProjects.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
    }

    const projects = sortProjects(mockProjects);

    const handleProjectChange: (index: number) => void = (index: number) => {
        if (currentProjectIndex === index) {
            return;
        }
        setDirection(index > currentProjectIndex ? 1 : -1);
        setCurrentProjectIndex(index);
    };

    return (
        <div className="flex flex-row w-full h-full">
            <div className="w-3/5">
                <Carousel slides={projects} onSlideChange={handleProjectChange} />
            </div>
            <div className="w-2/5 flex flex-col justify-center items-start p-4 mr-10 gap-6">
                {projects[currentProjectIndex] && (
                    <ProjectInfo project={projects[currentProjectIndex]} direction={direction} />
                )}
            </div>
        </div>
    );
});
