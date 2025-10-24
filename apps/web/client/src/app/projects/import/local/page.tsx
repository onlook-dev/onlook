'use client';

import { MotionCard } from '@onlook/ui/motion-card';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import useResizeObserver from 'use-resize-observer';
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
                className="w-[30rem] min-h-[12rem] overflow-hidden p-0 border border-primary/20 rounded-lg shadow-lg !bg-background"
            >
                <motion.div ref={ref} layout="position" className="flex flex-col">
                    <AnimatePresence
                        mode="popLayout"
                        initial={false}
                        custom={direction}
                    >
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
