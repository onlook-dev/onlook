import { Button } from '@/components/ui/button';
import { DotsVerticalIcon, Pencil2Icon } from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Project } from '/common/models/project';

export function ProjectInfo({
    projects,
    currentProjectIndex,
    direction,
}: {
    projects: Project[];
    currentProjectIndex: number;
    direction: number;
}) {
    const [project, setProject] = useState<Project | null>(null);
    useEffect(() => {
        setProject(projects[currentProjectIndex]);
    }, [currentProjectIndex]);

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

    function getDaysAgo(isoDate: string) {
        const date = new Date(isoDate);
        const today = new Date();
        const diff = today.getTime() - date.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    return (
        project && (
            <>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.p
                        key={currentProjectIndex}
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
                    <p>Last edited {getDaysAgo(project.updatedAt)} days ago </p>
                    <p>{project.url}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full">
                    <Button
                        size="default"
                        variant={'outline'}
                        className="gap-2 bg-bg-active border border-border-active w-full lg:w-auto"
                    >
                        <Pencil2Icon />
                        <p> Edit App </p>
                    </Button>
                    <Button size="default" variant={'ghost'} className="gap-2 w-full lg:w-auto">
                        <DotsVerticalIcon />
                        <p> Project settings</p>
                    </Button>
                </div>
            </>
        )
    );
}
