import type { Project } from '@onlook/models';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { EditAppButton } from './edit-app';
import { Settings } from './settings';

export const ProjectInfo = observer(
    ({ project, direction }: { project: Project; direction: number }) => {
        const [favicon, setFavicon] = useState<string | null>(null);
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

        // useEffect(() => {
        //     loadFavicon();
        // }, [project.sandbox.url]);

        // const loadFavicon = async () => {
        //     // How to get a favicon from a url?
        //     const favicon = await getFavicon(project.sandbox.url);
        //     if (favicon) {
        //         setFavicon(favicon);
        //     }
        // }

        return (
            project && (
                <div className="flex flex-col gap-4 max-w-[480px] w-full">
                    <div className="flex items-center gap-3 mb-1">
                        {/* TODO: This should show the favicon */}
                        {/* {favicon && (
                            <img
                                src={favicon}
                                alt="Preview"
                                className="w-8 h-8 rounded-lg bg-white object-cover border border-border"
                            />
                        )} */}
                        <span className="text-foreground-onlook text-regular">{project.sandbox.url}</span>
                    </div>
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
                    <div className="flex flex-col gap-1">
                        <p className="text-foreground-tertiary text-regular mb-1 text-balance">
                            {project.metadata.description ?? 'No description'}
                        </p>
                    </div>
                    <p className="text-foreground-tertiary text-mini mb-2">
                        {t('projects.select.lastEdited', {
                            time: timeAgo(new Date(project.metadata.updatedAt).toISOString()),
                        })}
                    </p>
                    <div className="border-[0.5px] border-border w-full mb-2" />
                    <div className="flex items-center justify-between w-full gap-3 sm:gap-5">
                        <EditAppButton project={project} />
                        <div className="flex-1" />
                        <Settings project={project} />
                    </div>
                </div>
            )
        );
    },
);
