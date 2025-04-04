import type { Project } from '@onlook/models/projects';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { EditAppButton } from './edit-app';
import { Settings } from './settings';

const ProjectInfo = observer(({ project, direction }: { project: Project; direction: number }) => {
    const t = useTranslations();
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
                            time: timeAgo(new Date(project.updatedAt).toISOString()),
                        })}
                    </p>
                    <p>{project.url}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full">
                    <EditAppButton project={project} />
                    <Settings project={project} />
                </div>
            </>
        )
    );
});

export default ProjectInfo;
