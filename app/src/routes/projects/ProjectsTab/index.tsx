import { useState } from 'react';
import EmblaCarousel from './Carousel';
import { ProjectInfo } from './Info';
import { CreateProject } from './Create';

export interface Project {
    id: number;
    img: string;
    title: string;
}

export function ProjectsTab() {
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const PROJECTS: Project[] = [
        // { id: 0, img: 'https://picsum.photos/id/237/200/300', title: 'Airbnb.com' },
        // { id: 1, img: 'https://picsum.photos/id/238/300/200', title: 'Netflix Clone' },
        // { id: 2, img: 'https://picsum.photos/id/239/500/500', title: 'Personal Portfolio' },
        // { id: 3, img: 'https://picsum.photos/id/240/100/1000', title: 'Amazon.com' },
        // { id: 4, img: 'https://picsum.photos/id/241/1000/100', title: 'X' },
        // { id: 5, img: 'https://picsum.photos/id/242/1000/1000', title: 'YC' },
    ];

    const handleProjectChange = (index: number) => {
        if (currentProjectIndex === index) {
            return;
        }
        setDirection(index > currentProjectIndex ? 1 : -1);
        setCurrentProjectIndex(index);
    };

    return (
        <div className="flex h-[calc(100vh-5.5rem)] w-full">
            {PROJECTS.length === 0 && <CreateProject />}
            {PROJECTS.length > 0 && (
                <>
                    <div className="w-3/5">
                        <EmblaCarousel slides={PROJECTS} onSlideChange={handleProjectChange} />
                    </div>
                    <div className="w-2/5 flex flex-col justify-center items-start p-4 gap-6">
                        <ProjectInfo
                            projects={PROJECTS}
                            currentProjectIndex={currentProjectIndex}
                            direction={direction}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
