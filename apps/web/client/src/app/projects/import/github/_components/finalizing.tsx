'use client';

import { CardDescription } from '@onlook/ui/card';
import { CardTitle } from '@onlook/ui/card';
import { motion } from 'motion/react';
import { ProgressWithInterval } from '@onlook/ui/progress-with-interval';
import { Button } from '@onlook/ui/button';
import { StepContent, StepFooter, StepHeader } from '../../steps';
import { useImportGithubProject } from '../_context/context';

export const FinalizingGithubProject = () => {
    const { isFinalizing, filesError, retry, cancel } = useImportGithubProject();

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
                    {filesError ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <p>{filesError}</p>
                        </div>
                    ) : (
                        <ProgressWithInterval isLoading={isFinalizing ?? false} />
                    )}
                </motion.div>
            </StepContent>
            <StepFooter>
                <Button onClick={cancel} disabled={isFinalizing} variant="outline">
                    Cancel
                </Button>
                {filesError && (
                    <Button onClick={retry} disabled={isFinalizing}>
                        Retry
                    </Button>
                )}
            </StepFooter>
        </>
    );
};
