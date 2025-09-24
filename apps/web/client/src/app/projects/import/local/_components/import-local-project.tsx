'use client';

import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import useResizeObserver from 'use-resize-observer';

import { MotionCard } from '@onlook/ui/motion-card';

import { useGetBackground } from '@/hooks/use-get-background';
import { useProjectCreation } from '../_context';
import { FinalizingProject } from './finalizing-project';
import { NewSelectFolder } from './select-folder';

const steps = [<NewSelectFolder />, <FinalizingProject />];

export const ImportLocalProject = () => {
    const { currentStep, direction } = useProjectCreation();
    const { ref } = useResizeObserver();

    const variants = {
        initial: (direction: number) => {
            return { x: `${120 * direction}%`, opacity: 0 };
        },
        active: { x: '0%', opacity: 1 },
        exit: (direction: number) => {
            return { x: `${-120 * direction}%`, opacity: 0 };
        },
    };
    const backgroundUrl = useGetBackground('create');
    return (
        <div
            className="relative flex h-full w-full items-center justify-center"
            style={{
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundImage: `url(${backgroundUrl})`,
            }}
        >
            <div className="relative z-10">
                <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
                    <MotionCard
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="bg-background/80 border-primary/20 min-h-[12rem] w-[30rem] overflow-hidden rounded-lg border p-0 shadow-lg"
                    >
                        <motion.div ref={ref} layout="position" className="flex flex-col">
                            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                                <motion.div
                                    key={currentStep}
                                    custom={direction}
                                    variants={variants}
                                    initial="initial"
                                    animate="active"
                                    exit="exit"
                                >
                                    {steps[currentStep]}
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    </MotionCard>
                </MotionConfig>
            </div>
        </div>
    );
};
