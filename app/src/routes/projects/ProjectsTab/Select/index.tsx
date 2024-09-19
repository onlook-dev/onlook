import { useState } from 'react';
import EmblaCarousel from './Carousel';
import { ProjectInfo } from './Info';
import { Project } from '/common/models/project';

function SelectProject({ projects }: { projects: Project[] }) {
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const handleProjectChange = (index: number) => {
        if (currentProjectIndex === index) {
            return;
        }
        setDirection(index > currentProjectIndex ? 1 : -1);
        setCurrentProjectIndex(index);
    };
    return (
        <>
            <div className="w-3/5">
                <EmblaCarousel slides={projects} onSlideChange={handleProjectChange} />
            </div>
            <div className="w-2/5 flex flex-col justify-center items-start p-4 gap-6">
                <ProjectInfo
                    projects={projects}
                    currentProjectIndex={currentProjectIndex}
                    direction={direction}
                />
            </div>
        </>
    );
}

export default SelectProject;
