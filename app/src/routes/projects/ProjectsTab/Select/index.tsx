import { useProjectManager } from '@/components/Context/Projects';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import EmblaCarousel from './Carousel';
import ProjectInfo from './Info';

const SelectProject = observer(() => {
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const projectsManager = useProjectManager();

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
                <EmblaCarousel
                    slides={projectsManager.projects}
                    onSlideChange={handleProjectChange}
                />
            </div>
            <div className="w-2/5 flex flex-col justify-center items-start p-4 gap-6">
                <ProjectInfo currentProjectIndex={currentProjectIndex} direction={direction} />
            </div>
        </>
    );
});

export default SelectProject;
