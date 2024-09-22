import { useProjectsManager } from '@/components/Context';
import { Button } from '@/components/ui/button';
import { Pencil2Icon } from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import ProjectSettingsButton from './ProjectSettingsButton';
import { timeSince } from '/common/helpers';
import { Project } from '/common/models/project';

const ProjectInfo = observer(({ project, direction }: { project: Project; direction: number }) => {
    const projectsManager = useProjectsManager();

    const variants = {
        enter: (direction: number) => ({
            y: direction > 0 ? 20 : -20,
            opacity: 0,
        }),
        center: {
            y: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            y: direction < 0 ? 20 : -20,
            opacity: 0,
        }),
    };

    const selectProject = (project: Project) => {
        projectsManager.project = project;
    };

    return (
        project && (
            <>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.p
                        key={project.id}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="inline-block text-text-active text-title1"
                    >
                        {project.name}
                    </motion.p>
                </AnimatePresence>
                <div className="text-text flex flex-col md:flex-row gap-2 md:gap-7 text-small">
                    <p>Last edited {timeSince(new Date(project.updatedAt))} ago </p>
                    <p>{project.url}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full">
                    <Button
                        size="default"
                        variant={'outline'}
                        className="gap-2 bg-bg-active border border-[0.5px] border-border-active w-full lg:w-auto"
                        onClick={() => selectProject(project)}
                    >
                        <Pencil2Icon />
                        <p> Edit App </p>
                    </Button>
                    <ProjectSettingsButton project={project} />
                </div>
            </>
        )
    );
});

export default ProjectInfo;
