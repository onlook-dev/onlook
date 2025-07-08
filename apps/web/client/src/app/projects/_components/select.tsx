'use client';

import { api } from '@/trpc/react';
import { Icons } from '@onlook/ui/icons';
import Link from 'next/link';
import { useState } from 'react';
import { Carousel } from './carousel';
import { ProjectInfo } from './info';

export const SelectProject = () => {
    const { data: fetchedProjects, refetch, isLoading } = api.project.list.useQuery();
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const projects = fetchedProjects ?? [];

    const handleProjectChange: (index: number) => void = (index: number) => {
        if (currentProjectIndex === index) {
            return;
        }
        setDirection(index > currentProjectIndex ? 1 : -1);
        setCurrentProjectIndex(index);
    };

    if (isLoading) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center">
                <div className="flex flex-row items-center gap-2">
                    <Icons.LoadingSpinner className="h-6 w-6 animate-spin text-foreground-primary" />
                    <div className="text-lg text-foreground-secondary">Loading projects...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-row w-full">
            {projects.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <div className="text-xl text-foreground-secondary">No projects found</div>
                    <div className="text-md text-foreground-tertiary">Create a new project to get started</div>
                    <div className="flex justify-center">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <Icons.ArrowLeft className="h-4 w-4" />
                            Back to home
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <div className="w-3/5 h-full">
                        <Carousel slides={projects} onSlideChange={handleProjectChange} />
                    </div>
                    <div className="w-2/5 flex flex-col justify-center items-start p-4 mr-10 gap-6">
                        {projects[currentProjectIndex] && (
                            <ProjectInfo project={projects[currentProjectIndex]} direction={direction} refetch={refetch} />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
