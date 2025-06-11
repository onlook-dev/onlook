import { MotionCard, MotionCardFooter } from '@onlook/ui/motion-card';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { ProcessedFile, Project, StepProps } from '../../constants';
import type { StepContent } from '../step-contents';
import { useState } from 'react';
import useResizeObserver from 'use-resize-observer';
import { withStepProps } from '../with-step-props';
import { NewSelectFolder } from './select-folder';
import { VerifyProject } from './verify-project';
import { api } from '@/trpc/client';
import { useUserManager } from '@/components/store/user';
import { blobToBase64String } from 'blob-util';
import { FinalizingProject } from './finalizing-project';
import { Routes } from '@/utils/constants';
import { redirect } from 'next/navigation';

interface CodeSandboxFile {
    content: string;
    isBinary?: boolean;
}

interface CodeSandboxProject {
    files: Record<string, CodeSandboxFile>;
    template?: string;
}

const steps: StepContent[] = [
    withStepProps(NewSelectFolder),
    withStepProps(VerifyProject),
    withStepProps(FinalizingProject),
];

export const ImportProject = () => {

    const [currentStep, setCurrentStep] = useState(0);
    const [projectData, setProjectData] = useState<Partial<Project>>({
        name: '',
        folderPath: '',
        files: [],
    });
    const userManager = useUserManager();
    const [direction, setDirection] = useState(0);
    const [isFinalizing, setIsFinalizing] = useState(false);

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
            isFinalizing,
        };


        return (
            <>
                {stepContent.header(stepProps)}
                {stepContent.content(stepProps)}
            </>
        );
    };

    const finalizeProject = async () => {
        try {
            setIsFinalizing(true);
            if (!projectData.files) {
                return;
            }

            const codeSandboxProject = await convertToCodeSandboxFormat(projectData.files);
            const { sandboxId, previewUrl } = await uploadToCodeSandbox(codeSandboxProject);
            if (!userManager.user?.id) {
                console.error('No user found');
                return;
            }
            const project = await api.project.create.mutate({
                project: {
                    name: projectData.name ?? 'New project',
                    sandboxId,
                    sandboxUrl: previewUrl,
                    description: 'Your new project',
                },
                userId: userManager.user.id,
            });
            if (!project) {
                console.error('Failed to create project');
                return;
            }
            // Open the project
            console.log('redirecting to project');
            
            redirect(`${Routes.PROJECT}/${project.id}`);
        } catch (error) {
            console.error('Error creating project:', error);
            return;
        } finally {
            setIsFinalizing(false);
        }
    };

    const convertToCodeSandboxFormat = async (
        files: ProcessedFile[],
    ): Promise<CodeSandboxProject> => {
        try {
            const sandboxFiles: Record<string, CodeSandboxFile> = {};

            // Add the Script to the 'layouts.tsx' file
            // Test on firefox, chrome, safari, edge, opera, brave, etc.

            for (const file of files) {
                if (file.isBinary) {
                    // Convert binary files to base64
                    const buffer = file.content as ArrayBuffer;
                    const blob = new Blob([buffer]);
                    const base64 = await blobToBase64String(blob);

                    sandboxFiles[file.path] = {
                        content: base64,
                        isBinary: true,
                    };
                } else {
                    const content = file.content as string;

                    sandboxFiles[file.path] = {
                        content,
                    };
                }
            }

            return {
                files: sandboxFiles,
                template: 'nextjs',
            };
        } catch (error) {
            console.error('Error converting to CodeSandbox format:', error);
            return {
                files: {},
                template: 'nextjs',
            };
        }
    };

    const uploadToCodeSandbox = async (
        project: CodeSandboxProject,
    ): Promise<{ sandboxId: string; previewUrl: string }> => {
        try {
            const response = await api.sandbox.uploadProject.mutate({
                files: project.files,
                projectName: projectData.folderPath,
            });

            return {
                sandboxId: response.sandboxId,
                previewUrl: response.previewUrl,
            };
        } catch (error) {
            console.error('Error uploading to CodeSandbox:', error);
            throw new Error('Failed to upload project to CodeSandbox');
        }
    };


    const nextStep = () => {
        if (currentStep < steps.length - 2) { // -2 because we have 2 final steps
            setDirection(1);
            setCurrentStep((prev) => prev + 1);
        } else {
            // This is the final step, so we should finalize the project
            setCurrentStep((prev) => prev + 1);
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
                                            isFinalizing,
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
