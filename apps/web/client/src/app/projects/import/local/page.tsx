'use client';

import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import useResizeObserver from 'use-resize-observer';

import { MotionCard } from '@onlook/ui/motion-card';

import { FinalizingProject } from './_components/finalizing-project';
import { NewSelectFolder } from './_components/select-folder';
import { useProjectCreation } from './_context';

const steps = [<NewSelectFolder />, <FinalizingProject />];

const Page = () => {
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

    return (
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="border-primary/20 !bg-background min-h-[12rem] w-[30rem] overflow-hidden rounded-lg border p-0 shadow-lg"
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
    );
};

export default Page;
