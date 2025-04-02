"use client"

// import { useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
// import EmblaCarousel from './Carousel';
import ProjectInfo from './info';
import type { Project } from '@onlook/models/projects';
import Carousel from './carousel';

export const SelectProject = observer(() => {
    const { t } = useTranslation();
    // const projectsManager = useProjectsManager();
    // const [projects, setProjects] = useState<Project[]>(sortProjects(projectsManager.projects));
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    // TODO: remove this
    const projects: Project[] = [{
        id: '1',
        name: 'Project 1',
        folderPath: 'Project 1',
        url: 'https://www.google.com',
        previewImg: 'https://www.google.com',
        createdAt: '2021-01-01',
        updatedAt: '2021-01-01',
        settings: null,
        commands: null,
        domains: null,
    },
    {
        id: '2',
        name: 'Project 2',
        folderPath: 'Project 2',
        url: 'https://www.google.com',
        previewImg: 'https://www.google.com',
        createdAt: '2021-01-01',
        updatedAt: '2021-01-01',
        settings: null,
        commands: null,
        domains: null,
    }]

    const sortProjects = (unsortedProjects: Project[]) => {
        return unsortedProjects.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
    }

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
                <ProjectInfo project={projects[currentProjectIndex]} direction={direction} />
            </div>
        </div>
    );
});
