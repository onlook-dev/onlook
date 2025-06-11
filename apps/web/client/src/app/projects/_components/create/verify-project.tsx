import { MotionConfig } from 'motion/react';

import { CardDescription } from '@onlook/ui/card';
import { CardTitle } from '@onlook/ui/card';
import { AnimatePresence } from 'motion/react';
import type { ProcessedFile, StepProps } from '../../constants';
import { Button } from '@onlook/ui/button';
import { motion } from 'motion/react';
import { Icons } from '@onlook/ui/icons';
import type { StepComponent } from '../with-step-props';
import { api } from '@/trpc/client';
import { useEffect, useState } from 'react';
import { blobToBase64String } from 'blob-util';

interface NextJsProjectValidation {
    isValid: boolean;
    routerType?: 'app' | 'pages';
    error?: string;
}

interface CodeSandboxFile {
    content: string;
    isBinary?: boolean;
}

interface CodeSandboxProject {
    files: Record<string, CodeSandboxFile>;
    template?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

const VerifyProject: StepComponent = ({
    props,
    variant,
}: {
    props: StepProps;
    variant: 'header' | 'content' | 'footer';
}) => {
    const { projectData, prevStep, nextStep } = props;
    const [validation, setValidation] = useState<NextJsProjectValidation | null>(null);

    useEffect(() => {
        validateProject();
    }, [projectData]);

    const validateProject = async () => {
        if (!projectData.files) {
            return;
        }
        const validation = await validateNextJsProject(projectData.files);
        setValidation(validation);
    };

    const validateNextJsProject = async (
        files: ProcessedFile[],
    ): Promise<NextJsProjectValidation> => {
        // Look for package.json
        const packageJsonFile = files.find((f) => f.path.endsWith('package.json') && !f.isBinary);

        if (!packageJsonFile) {
            return { isValid: false, error: 'No package.json found' };
        }

        try {
            const packageJson = JSON.parse(packageJsonFile.content as string);

            // Check for Next.js in dependencies
            const hasNext = packageJson.dependencies?.next || packageJson.devDependencies?.next;
            if (!hasNext) {
                return { isValid: false, error: 'Next.js not found in dependencies' };
            }

            // Check for React dependencies
            const hasReact = packageJson.dependencies?.react || packageJson.devDependencies?.react;
            if (!hasReact) {
                return { isValid: false, error: 'React not found in dependencies' };
            }

            // Determine router type
            let routerType: 'app' | 'pages' = 'pages';

            // Check for App Router (app directory with layout file)
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


    const finalizeProject = async () => {
        console.log(projectData);
        if (!projectData.files) {
            return;
        }
        const codeSandboxProject = await convertToCodeSandboxFormat(projectData.files);
        console.log(codeSandboxProject);
        const { sandboxId, previewUrl } = await uploadToCodeSandbox(codeSandboxProject);
        console.log(sandboxId, previewUrl); 
    };

    const convertToCodeSandboxFormat = async (
        files: ProcessedFile[],
    ): Promise<CodeSandboxProject> => {
        try {
            const sandboxFiles: Record<string, CodeSandboxFile> = {};
            let dependencies: Record<string, string> = {};
            let devDependencies: Record<string, string> = {};

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
    
                    // Extract dependencies from package.json
                    if (file.path.endsWith('package.json')) {
                        try {
                            const pkg = JSON.parse(content);
                            dependencies = pkg.dependencies || {};
                            devDependencies = pkg.devDependencies || {};
                        } catch (error) {
                            console.warn('Error parsing package.json:', error);
                        }
                    }
    
                    sandboxFiles[file.path] = {
                        content,
                    };
                }
            }
    
            return {
                files: sandboxFiles,
                template: 'node',
                dependencies,
                devDependencies,
            };
        } catch (error) {
            console.error('Error converting to CodeSandbox format:', error);
            return {
                files: {},
                template: 'node',
                dependencies: {},
                devDependencies: {},
            };
        }
    };

    const uploadToCodeSandbox = async (
        project: CodeSandboxProject,
    ): Promise<{ sandboxId: string; previewUrl: string }> => {
        try {
            const response = await api.sandbox.uploadProject.mutate({
                files: project.files,
                dependencies: project.dependencies,
                devDependencies: project.devDependencies,
                projectName: projectData.name,
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

    const validProject = () => (
        <motion.div
            key="name"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full flex flex-row items-center border p-4 rounded-lg bg-teal-900 border-teal-600 gap-2"
        >
            <div className="flex flex-row items-center justify-between w-full gap-4">
                <div className="p-3 bg-teal-500 rounded-lg">
                    <Icons.Directory className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1 break-all w-full">
                    <p className="text-regular text-teal-100">{projectData.name}</p>
                    <p className="text-teal-200 text-mini">{projectData.folderPath}</p>
                </div>
            </div>
            <Icons.CheckCircled className="w-5 h-5 text-teal-200" />
        </motion.div>
    );

    const invalidProject = () => (
        <motion.div
            key="name"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full flex flex-row items-center border p-4 rounded-lg bg-amber-900 border-amber-600 gap-2"
        >
            <div className="flex flex-col gap-2 w-full">
                <div className="flex flex-row items-center justify-between w-full gap-3">
                    <div className="p-3 bg-amber-500 rounded-md">
                        <Icons.Directory className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1 break-all w-full">
                        <p className="text-regular text-amber-100">{projectData.name}</p>
                        <p className="text-amber-200 text-mini">{projectData.folderPath}</p>
                    </div>
                    <Icons.ExclamationTriangle className="w-5 h-5 text-amber-200" />
                </div>
                <p className="text-amber-100 text-sm">This is not a NextJS Project</p>
            </div>
        </motion.div>
    );

    const renderHeader = () => {
        if (!validation) {
            return (
                <>
                    <CardTitle>{'Verifying compatibility with Onlook'}</CardTitle>
                    <CardDescription>
                        {'We’re checking to make sure this project can work with Onlook'}
                    </CardDescription>
                </>
            );
        }
        if (validation?.isValid) {
            return (
                <>
                    <CardTitle>{'Project verified'}</CardTitle>
                    <CardDescription>
                        {'Your project is ready to import to Onlook'}
                    </CardDescription>  
                </>
            );
        } else {
            return (
                <>
                    <CardTitle>{'This project won’t work with Onlook '}</CardTitle>
                    <CardDescription>
                        {'Onlook only works with NextJS + React + Tailwind projects'}
                    </CardDescription>
                </>
            );
        }

    };

    const renderContent = () => (
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <AnimatePresence mode="popLayout">
                <motion.div
                    key="name"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full"
                >
                    {validation?.isValid ? validProject() : invalidProject()}
                </motion.div>
            </AnimatePresence>
        </MotionConfig>
    );
    const renderFooter = () => {
        if (validation?.isValid) {
            return (
                <div className="flex flex-row w-full justify-between">
                    <Button onClick={prevStep}>Cancel</Button>
                    <Button className='px-3 py-2' onClick={finalizeProject}>Continue setup</Button>
                </div>
            );
        }
        if (validation?.isValid) {
            return (
                <div className="flex flex-row w-full justify-between">
                    <Button onClick={prevStep}>Cancel</Button>
                    <Button onClick={prevStep}>Select a different folder</Button>
                </div>
            );
        }
        return (
            <div className="flex flex-row w-full justify-between">
                <Button onClick={prevStep}>Cancel</Button>
                <Button onClick={nextStep}>Start designing</Button>
            </div>
        );
    };
    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

VerifyProject.Header = (props: StepProps) => <VerifyProject props={props} variant="header" />;
VerifyProject.Content = (props: StepProps) => <VerifyProject props={props} variant="content" />;
VerifyProject.Footer = (props: StepProps) => <VerifyProject props={props} variant="footer" />;

VerifyProject.Header.displayName = 'VerifyProject.Header';
VerifyProject.Content.displayName = 'VerifyProject.Content';
VerifyProject.Footer.displayName = 'VerifyProject.Footer';

export { VerifyProject };
