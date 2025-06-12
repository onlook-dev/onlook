import { MotionCard, MotionCardFooter } from '@onlook/ui/motion-card';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useState } from 'react';
import useResizeObserver from 'use-resize-observer';
import { withStepProps } from '../with-step-props';
import { ImportGithubProjectProvider, useImportGithubProject } from './context';
import { ConnectGithub } from './connect';
import { SetupGithub } from './setup';

const steps = [
    withStepProps(ConnectGithub),
    withStepProps(SetupGithub),
];

const ImportProjectContent = () => {
    const { currentStep } = useImportGithubProject();
    const { ref, height } = useResizeObserver();

    const variants = {
        initial: (direction: number) => {
            return { x: `${120 * direction}%`, opacity: 0 };
        },
        active: { x: '0%', opacity: 1 },
        exit: (direction: number) => {
            return { x: `${-120 * direction}%`, opacity: 0 };
        },
    };

    const renderStep = () => {
        const stepContent = steps[currentStep];
        if (!stepContent) {
            return (
                <motion.p
                    layout="position"
                    initial={{ opacity: 0, y: 200 }}
                    animate={{height, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 200 }}
                >
                    {'Project created successfully.'}
                </motion.p>
            );
        }

        return (
            <>
                {stepContent.header()}
                {stepContent.content()}
            </>
        );
    };

    return (
        <div className="fixed inset-0">
            <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-background/50" />
                <div className="relative z-10">
                    <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
                        <MotionCard
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="w-[30rem] min-h-[12rem] backdrop-blur-md bg-background/30 overflow-hidden p-0"
                        >
                            <motion.div ref={ref} layout="position" className="flex flex-col">
                                <AnimatePresence
                                    mode="popLayout"
                                    initial={false}
                                    // custom={direction}
                                >
                                    <motion.div
                                        key={currentStep}
                                        // custom={direction}
                                        variants={variants}
                                        initial="initial"
                                        animate="active"
                                        exit="exit"
                                    >
                                        {renderStep()}
                                    </motion.div>
                                </AnimatePresence>
                                <MotionCardFooter
                                    initial={{ opacity: 0, y: 200 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 200 }}
                                    layout="position"
                                    className="text-sm pb-4"
                                >
                                    <div id="footer-buttons" className="w-full">
                                        {steps[currentStep]?.footerButtons()}
                                    </div>
                                </MotionCardFooter>
                            </motion.div>
                        </MotionCard>
                    </MotionConfig>
                </div>
            </div>
        </div>
    );
};

export const ImportGithubProject = () => {
    return (
        <ImportGithubProjectProvider totalSteps={steps.length}>
            <ImportProjectContent />
        </ImportGithubProjectProvider>
    );
};