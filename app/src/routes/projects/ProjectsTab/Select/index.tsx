import { useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import EmblaCarousel from './Carousel';
import ProjectInfo from './Info';
import { Project } from '/common/models/project';

const SelectProject = observer(() => {
    const projectsManager = useProjectsManager();
    const [projects, setProjects] = useState<Project[]>(projectsManager.projects);
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        const sortedProjects = projectsManager.projects.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setProjects(sortedProjects);
    }, [projectsManager.projects]);

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
                <ProjectInfo project={projects[currentProjectIndex]} direction={direction} />
            </div>
        </>
    );
});

export default SelectProject;
