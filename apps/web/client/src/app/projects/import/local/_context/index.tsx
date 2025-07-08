'use client';

import { ProcessedFileType, type NextJsProjectValidation, type ProcessedFile } from '@/app/projects/types';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { type SandboxBrowserSession, type WebSocketSession } from '@codesandbox/sdk';
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { SandboxTemplates, Templates } from '@onlook/constants';
import { generate, injectPreloadScript, parse } from '@onlook/parser';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

export interface Project {
    name: string;
    folderPath: string;
    files: ProcessedFile[];
}

interface ProjectCreationContextValue {
    // State
    currentStep: number;
    projectData: Partial<Project>;
    direction: number;
    isFinalizing: boolean;
    totalSteps: number;

    // Actions
    error: string | null;
    setProjectData: (newData: Partial<Project>) => void;
    nextStep: () => void;
    prevStep: () => void;
    setCurrentStep: (step: number) => void;
    setDirection: (direction: number) => void;
    resetProjectData: () => void;
    retry: () => void;
    cancel: () => void;
    validateNextJsProject: (files: ProcessedFile[]) => Promise<NextJsProjectValidation>;
}

const ProjectCreationContext = createContext<ProjectCreationContextValue | undefined>(undefined);

interface ProjectCreationProviderProps {
    children: ReactNode;
    totalSteps: number;
}

export const ProjectCreationProvider = ({
    children,
    totalSteps,
}: ProjectCreationProviderProps) => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [projectData, setProjectDataState] = useState<Partial<Project>>({
        name: '',
        folderPath: '',
        files: [],
    });
    const [error, setError] = useState<string | null>(null);
    const [direction, setDirection] = useState(0);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const { data: user } = api.user.get.useQuery();
    const { mutateAsync: createProject } = api.project.create.useMutation();
    const { mutateAsync: forkSandbox } = api.sandbox.fork.useMutation();
    const { mutateAsync: startSandbox } = api.sandbox.start.useMutation();

    const setProjectData = (newData: Partial<Project>) => {
        setProjectDataState((prevData) => ({ ...prevData, ...newData }));
    };

    const finalizeProject = async () => {
        try {
            setIsFinalizing(true);

            if (!user?.id) {
                console.error('No user found');
                return;
            }
            if (!projectData.files) {
                return;
            }

            const template = SandboxTemplates[Templates.BLANK];
            const forkedSandbox = await forkSandbox({
                sandbox: {
                    id: template.id,
                    port: template.port,
                },
                config: {
                    title: `Imported project - ${user.id}`,
                    tags: ['imported', 'local', user.id],
                },
            });

            const browserSession: SandboxBrowserSession = await startSandbox({
                sandboxId: forkedSandbox.sandboxId,
                userId: user.id,
            });

            const session = await connectToSandbox({
                session: browserSession,
                getSession: async (id) => {
                    return await startSandbox({
                        sandboxId: id,
                        userId: user.id,
                    });
                },
            });

            await uploadToSandbox(projectData.files, session);
            await session.setup.run();
            await session.setup.waitUntilComplete();
            await session.disconnect();

            const project = await createProject({
                project: {
                    name: projectData.name ?? 'New project',
                    sandboxId: forkedSandbox.sandboxId,
                    sandboxUrl: forkedSandbox.previewUrl,
                    description: 'Your new project',
                },
                userId: user.id,
            });
            if (!project) {
                console.error('Failed to create project');
                return;
            }
            // Open the project
            router.push(`${Routes.PROJECT}/${project.id}`);
        } catch (error) {
            console.error('Error creating project:', error);
            setError('Failed to create project');
            return;
        } finally {
            setIsFinalizing(false);
        }
    };

    const validateNextJsProject = async (
        files: ProcessedFile[],
    ): Promise<NextJsProjectValidation> => {
        const packageJsonFile = files.find((f) => f.path.endsWith('package.json') && f.type === ProcessedFileType.TEXT);

        if (!packageJsonFile) {
            return { isValid: false, error: 'No package.json found' };
        }

        try {
            const packageJson = JSON.parse(packageJsonFile.content as string);
            const hasNext = packageJson.dependencies?.next || packageJson.devDependencies?.next;
            if (!hasNext) {
                return { isValid: false, error: 'Next.js not found in dependencies' };
            }

            const hasReact = packageJson.dependencies?.react || packageJson.devDependencies?.react;
            if (!hasReact) {
                return { isValid: false, error: 'React not found in dependencies' };
            }

            let routerType: 'app' | 'pages' = 'pages';

            const hasAppLayout = files.some(
                (f) =>
                    (f.path.includes('app/layout.') || f.path.includes('src/app/layout.')) &&
                    (f.path.endsWith('.tsx') ||
                        f.path.endsWith('.ts') ||
                        f.path.endsWith('.jsx') ||
                        f.path.endsWith('.js')),
            );

            if (hasAppLayout) {
                routerType = 'app';
            } else {
                // Check for Pages Router (pages directory)
                const hasPagesDir = files.some(
                    (f) => f.path.includes('pages/') || f.path.includes('src/pages/'),
                );

                if (!hasPagesDir) {
                    return {
                        isValid: false,
                        error: 'No valid Next.js router structure found (missing app/ or pages/ directory)',
                    };
                }
            }

            return { isValid: true, routerType };
        } catch (error) {
            return { isValid: false, error: 'Invalid package.json format' };
        }
    };


    const nextStep = () => {
        if (currentStep < totalSteps - 2) {
            // -2 because we have 2 final steps
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
            resetProjectData();
            return;
        }
        setDirection(-1);
        setCurrentStep((prev) => prev - 1);
    };

    const resetProjectData = () => {
        setProjectData({
            folderPath: undefined,
            name: undefined,
            files: undefined,
        });
        setCurrentStep(0);
        setError(null);
    };

    const retry = () => {
        setError(null);
        finalizeProject();
    };

    const cancel = () => {
        resetProjectData();
    };

    const value: ProjectCreationContextValue = {
        currentStep,
        projectData,
        direction,
        isFinalizing,
        totalSteps,
        error,
        setProjectData,
        nextStep,
        prevStep,
        setCurrentStep,
        setDirection,
        resetProjectData,
        retry,
        cancel,
        validateNextJsProject,
    };

    return (
        <ProjectCreationContext.Provider value={value}>{children}</ProjectCreationContext.Provider>
    );
};

export const useProjectCreation = (): ProjectCreationContextValue => {
    const context = useContext(ProjectCreationContext);
    if (context === undefined) {
        throw new Error('useProjectCreation must be used within a ProjectCreationProvider');
    }
    return context;
};

export const uploadToSandbox = async (files: ProcessedFile[], session: WebSocketSession) => {
    for (const file of files) {
        try {
            if (file.type === ProcessedFileType.BINARY) {
                const uint8Array = new Uint8Array(file.content);
                await session.fs.writeFile(file.path, uint8Array, {
                    overwrite: true,
                });
            } else {
                let content = file.content;

                const isLayout = file.path.endsWith('app/layout.tsx') || file.path.endsWith('src/app/layout.tsx');
                if (isLayout) {
                    try {
                        const ast = parse(content, {
                            sourceType: 'module',
                            plugins: ['jsx', 'typescript'],
                        });
                        const modifiedAst = injectPreloadScript(ast);
                        content = generate(modifiedAst, {}, content).code;
                    } catch (parseError) {
                        console.warn(
                            'Failed to add script config to layout.tsx:',
                            parseError,
                        );
                    }
                }
                await session.fs.writeTextFile(file.path, content, {
                    overwrite: true,
                });
            }
        } catch (fileError) {
            console.error(`Error uploading file ${file.path}:`, fileError);
            throw new Error(
                `Failed to upload file: ${file.path} - ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
            );
        }
    }
};
