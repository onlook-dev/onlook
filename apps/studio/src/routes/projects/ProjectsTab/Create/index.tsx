import backgroundImageDark from '@/assets/dunes-create-dark.png';
import backgroundImageLight from '@/assets/dunes-create-light.png';
import { useProjectsManager } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { sendAnalytics } from '@/lib/utils';
import { CreateMethod, getStepName } from '@/routes/projects/helpers';
import type { Project } from '@onlook/models/projects';
import { MotionCard, MotionCardFooter } from '@onlook/ui/motion-card';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useEffect, useState } from 'react';
import useResizeObserver from 'use-resize-observer';
import { loadProjectSteps, newProjectSteps, type StepContent } from './stepContents';

export interface StepProps {
    projectData: Partial<Project & { hasCopied?: boolean }>;
    setProjectData: (data: Partial<Project & { hasCopied?: boolean }>) => void;
    currentStep: number;
    totalSteps: number;
    prevStep: () => void;
    nextStep: () => void;
}

const variants = {
    initial: (direction: number) => {
        return { x: `${120 * direction}%`, opacity: 0 };
    },
    active: { x: '0%', opacity: 1 },
    exit: (direction: number) => {
        return { x: `${-120 * direction}%`, opacity: 0 };
    },
};

const DEFAULT_PROJECT_DATA = {
    url: 'http://localhost:3000',
    runCommand: 'npm run dev',
    hasCopied: false,
};

const CreateProject = ({
    createMethod,
    setCreateMethod,
}: {
    createMethod: CreateMethod | null;
    setCreateMethod: (method: CreateMethod | null) => void;
}) => {
    const projectsManager = useProjectsManager();

    const [currentStep, setCurrentStep] = useState(0);
    const [steps, setSteps] = useState<StepContent[]>([]);
    const [projectData, setProjectData] =
        useState<Partial<Project & { hasCopied?: boolean }>>(DEFAULT_PROJECT_DATA);
    const [direction, setDirection] = useState(0);

    const { ref, height } = useResizeObserver();
    const { theme } = useTheme();

    const [backgroundImage, setBackgroundImage] = useState(backgroundImageLight);

    useEffect(() => {
        const determineBackgroundImage = () => {
            if (theme === 'dark') {
                return backgroundImageDark;
            } else if (theme === 'light') {
                return backgroundImageLight;
            } else if (theme === 'system') {
                return window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? backgroundImageDark
                    : backgroundImageLight;
            }
            return backgroundImageLight;
        };

        setBackgroundImage(determineBackgroundImage());
    }, [theme]);

    useEffect(() => {
        setCurrentStep(0);
        setProjectData(DEFAULT_PROJECT_DATA);

        if (createMethod === CreateMethod.NEW) {
            setSteps(newProjectSteps);
        } else if (createMethod === CreateMethod.LOAD) {
            setSteps(loadProjectSteps);
        }
        sendAnalytics('start create project', { method: createMethod });
    }, [createMethod]);

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
            setCreateMethod(null);
            return;
        }
        setDirection(-1);
        setCurrentStep((prev) => prev - 1);
    };

    const finalizeProject = () => {
        if (
            !projectData.name ||
            !projectData.url ||
            !projectData.folderPath ||
            !projectData.runCommand
        ) {
            throw new Error('Project data is missing.');
        }

        const newProject = projectsManager.createProject(
            projectData.name,
            projectData.url,
            projectData.folderPath,
            projectData.runCommand,
        );

        projectsManager.project = newProject;
        sendAnalytics('create project', {
            url: newProject.url,
            method: createMethod,
            id: newProject.id,
        });
        setCreateMethod(null);
    };

    const renderStep = () => {
        const stepContent = steps[currentStep];
        if (!stepContent) {
            return (
                <motion.p
                    layout="position"
                    initial={{ opacity: 0, y: 200 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 200 }}
                >
                    {'Project created successfully.'}
                </motion.p>
            );
        }

        const stepProps: StepProps = {
            projectData,
            setProjectData: (newData) =>
                setProjectData((prevData) => ({ ...prevData, ...newData })),
            currentStep,
            totalSteps: steps.length,
            prevStep,
            nextStep,
        };

        sendAnalytics('creation step', {
            method: createMethod,
            step: currentStep,
            stepName: getStepName(createMethod, currentStep),
        });

        return (
            <>
                {stepContent.header(stepProps)}
                {stepContent.content(stepProps)}
            </>
        );
    };

    return (
        <div className="fixed inset-0">
            <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-background/50" />
                <div className="relative z-10">
                    <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
                        <MotionCard
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ height, opacity: 1, y: 0 }}
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
                                    <p className="text-foreground-onlook">{`${currentStep + 1} of ${steps.length}`}</p>
                                    <div id="footer-buttons" className="flex ml-auto gap-2">
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

export default CreateProject;
