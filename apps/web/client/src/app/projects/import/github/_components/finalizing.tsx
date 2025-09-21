'use client';

import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { ProgressWithInterval } from '@onlook/ui/progress-with-interval';
import { motion } from 'motion/react';
import { StepContent, StepFooter, StepHeader } from '../../steps';
import { useImportGithubProject } from '../_context';

export const FinalizingGithubProject = () => {
    const { repositoryImport, retry, cancel } = useImportGithubProject();

    return (
        <>
            <StepHeader>
                <CardTitle>{'Setting up project...'}</CardTitle>
                <CardDescription>{"We're setting up your project"}</CardDescription>
            </StepHeader>
            <StepContent>
                <motion.div
                    key="name"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full"
                >
                    {repositoryImport.error ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <p>{repositoryImport.error}</p>
                        </div>
                    ) : (
                        <ProgressWithInterval isLoading={repositoryImport.isImporting ?? false} />
                    )}
                </motion.div>
            </StepContent>
            <StepFooter>
                <Button onClick={cancel} disabled={repositoryImport.isImporting} variant="outline">
                    Cancel
                </Button>
                {repositoryImport.error && (
                    <Button onClick={retry} disabled={repositoryImport.isImporting}>
                        Retry
                    </Button>
                )}
            </StepFooter>
        </>
    );
};
