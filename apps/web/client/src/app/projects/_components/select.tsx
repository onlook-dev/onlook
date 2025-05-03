"use client"

import { useProjectManager } from '@/components/store';
import type { Project } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import Carousel from './carousel';
import ProjectInfo from './info';

// TODO: This will use a projects manager, not project manager
export const SelectProject = observer(() => {
    const projectsManager = useProjectManager();
    // const [projects, setProjects] = useState<Project[]>(sortProjects(projectsManager.projects));
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    // TODO: remove this
    const mockProjects: Project[] = [{
        id: '1',
        name: 'Project 1',
        previewUrl: 'http://localhost:8084',
        canvas: null,
        domains: null,
        sandbox: null,
        metadata: {
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12).toISOString(),
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12).toISOString(),
            previewImg: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
        },
    },
    {
        id: '2',
        name: 'Project 2',
        previewUrl: 'http://localhost:8084',
        canvas: null,
        domains: null,
        sandbox: null,
        metadata: {
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            previewImg: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
        },
    },
    {
        id: '3',
        name: 'Project 3',
        previewUrl: 'http://localhost:8084',
        canvas: null,
        domains: null,
        sandbox: null,
        metadata: {
            createdAt: new Date(Date.now() - 1000 * 60).toISOString(),
            updatedAt: new Date(Date.now() - 1000 * 60).toISOString(),
            previewImg: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
        },
    }];

    const sortProjects = (unsortedProjects: Project[]) => {
        return unsortedProjects.sort(
            (a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime(),
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
        <div className="flex flex-row w-full">
            <div className="w-3/5 h-full">
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
