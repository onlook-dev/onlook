import { MotionCard, MotionCardFooter } from '@onlook/ui/motion-card';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { Project, StepProps } from '../../constants';
import type { StepContent } from '../step-contents';
import { useState } from 'react';
import useResizeObserver from 'use-resize-observer';
import { withStepProps } from '../with-step-props';
import { NewSelectFolder } from './select-folder';
import { VerifyProject } from './verify-project';

const steps: StepContent[] = [
    withStepProps(NewSelectFolder),
    withStepProps(VerifyProject),
];

export const ImportProject = () => {

    const [currentStep, setCurrentStep] = useState(0);
    const [projectData, setProjectData] = useState<Partial<Project>>({
        name: '',
        folderPath: '',
        files: [],
    });
    const [direction, setDirection] = useState(0);

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

        const stepProps: StepProps = {
            projectData: projectData || {},
            setProjectData: (newData) =>
                setProjectData((prevData) => ({ ...prevData, ...newData })),
            currentStep,
            totalSteps: steps.length,
            prevStep,
            nextStep,
        };


        return (
            <>
                {stepContent.header(stepProps)}
                {stepContent.content(stepProps)}
            </>
        );
    };

    const finalizeProject = () => {
        console.log('finalizeProject');
    };


    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setDirection(1);
            setCurrentStep((prev) => prev + 1);
        } else {
            // This is the last step, so we should finalize the project
            finalizeProject();
        }
    };

    const prevStep = () => {
        if (currentStep === 0) {
            return;
        }
        setDirection(-1);
        setCurrentStep((prev) => prev - 1);
    };

    // useEffect(() => {
    //     setCurrentStep(0);
    //     setProjectData(DEFAULT_PROJECT_DATA);

    //     if (createMethod === CreateMethod.NEW) {
    //         setSteps(newProjectSteps);
    //     } else if (createMethod === CreateMethod.LOAD) {
    //         setSteps(loadProjectSteps);
    //     }
    // }, []);

    return (
        <div className="fixed inset-0">
            <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                    // backgroundImage: `url(${backgroundImage})`,
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
                                        {steps[currentStep]?.footerButtons({
                                            projectData,
                                            setProjectData: (newData) =>
                                                setProjectData((prevData) => ({
                                                    ...prevData,
                                                    ...newData,
                                                })),
                                            currentStep,
                                            totalSteps: steps.length,
                                            prevStep,
                                            nextStep,
                                        })}
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
