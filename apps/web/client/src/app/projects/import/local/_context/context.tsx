'use client';

import type { ProcessedFile, Project } from '@/app/projects/types';
import { useUserManager } from '@/components/store/user';
import { api } from '@/trpc/client';
import { Routes } from '@/utils/constants';
import { blobToBase64String } from 'blob-util';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

interface CodeSandboxFile {
    content: string;
    isBinary?: boolean;
}

interface CodeSandboxProject {
    files: Record<string, CodeSandboxFile>;
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
}

const ProjectCreationContext = createContext<ProjectCreationContextValue | undefined>(undefined);

interface ProjectCreationProviderProps {
    children: ReactNode;
    totalSteps: number;
}

export const ProjectCreationProvider: React.FC<ProjectCreationProviderProps> = ({
    children,
    totalSteps,
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [projectData, setProjectDataState] = useState<Partial<Project>>({
        name: '',
        folderPath: '',
        files: [],
    });
    const [error, setError] = useState<string | null>(null);
    const [direction, setDirection] = useState(0);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const userManager = useUserManager();
    const router = useRouter();

    const setProjectData = (newData: Partial<Project>) => {
        setProjectDataState((prevData) => ({ ...prevData, ...newData }));
    };

    const convertToCodeSandboxFormat = async (
        files: ProcessedFile[],
    ): Promise<CodeSandboxProject> => {
        try {
            const sandboxFiles: Record<string, CodeSandboxFile> = {};

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
            };
        } catch (error) {
            console.error('Error converting to CodeSandbox format:', error);
            return {
                files: {},
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

    const finalizeProject = async () => {
        try {
            setIsFinalizing(true);

            if (!userManager.user?.id) {
                console.error('No user found');
                return;
            }
            if (!projectData.files) {
                return;
            }

            const codeSandboxProject = await convertToCodeSandboxFormat(projectData.files);
            const { sandboxId, previewUrl } = await uploadToCodeSandbox(codeSandboxProject);

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
            router.push(`${Routes.PROJECT}/${project.id}`);
        } catch (error) {
            console.error('Error creating project:', error);
            setError('Failed to create project');
            return;
        } finally {
            setIsFinalizing(false);
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
