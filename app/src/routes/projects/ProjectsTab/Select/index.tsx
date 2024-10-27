import { useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import EmblaCarousel from './Carousel';
import ProjectInfo from './Info';
import { Project } from '/common/models/project';
import { motion } from 'framer-motion';

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
            <motion.div
                key={'carousel'}
                className="w-[60vw] absolute left-0 h-full"
                initial={{
                    position: 'absolute',
                    left: 0,
                }}
                exit={{
                    width: '100vw'
                }}
                transition={{
                    duration: 0.5,
                }}
            >
                <EmblaCarousel slides={projects} onSlideChange={handleProjectChange} />
            </motion.div>

            <motion.div
                className="w-[40vw] absolute right-0 flex flex-col justify-center items-start p-4 gap-6 h-full"
                key={'info'}
                initial={{ opacity: 1, position: 'absolute', right: 0 }}
                exit={{
                    opacity: 0,
                    translateX: '100%',
                }}
                transition={{
                    duration: 0.3,
                }}
            >
                <ProjectInfo project={projects[currentProjectIndex]} direction={direction} />
            </motion.div>
        </>
    );
});

export default SelectProject;
