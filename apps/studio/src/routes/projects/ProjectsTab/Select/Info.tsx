import type { Project } from '@onlook/models/projects';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { EditAppButton } from './EditAppButton';
import ProjectSettingsButton from './ProjectSettingsButton';
import { timeSince } from '/common/helpers';

const ProjectInfo = observer(({ project, direction }: { project: Project; direction: number }) => {
    const { t } = useTranslation();
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
                        className="inline-block text-foreground-active text-title1"
                    >
                        {project.name}
                    </motion.p>
                </AnimatePresence>
                <div className="text-foreground-onlook flex flex-col md:flex-row gap-2 md:gap-7 text-small">
                    <p>
                        {t('projects.select.lastEdited', {
                            time: timeSince(new Date(project.updatedAt)),
                        })}
                    </p>
                    <p>{project.url}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full">
                    <EditAppButton project={project} />
                    <ProjectSettingsButton project={project} />
                </div>
            </>
        )
    );
});

export default ProjectInfo;
