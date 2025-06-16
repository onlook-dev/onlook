'use client';

import { MotionCard } from '@onlook/ui/motion-card';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import useResizeObserver from 'use-resize-observer';
import { NewSelectFolder } from './select-folder';
import { FinalizingProject } from './finalizing-project';
import { useProjectCreation } from '../_context/context';
import { useGetBackground } from '@/hooks/use-get-background';

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
            className="relative w-full h-full flex items-center justify-center"
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
                        className="w-[30rem] min-h-[12rem] bg-background/80 overflow-hidden p-0 border border-primary/20 rounded-lg shadow-lg"
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
