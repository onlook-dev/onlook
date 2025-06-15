'use client';

import { CardDescription } from '@onlook/ui/card';
import { CardTitle } from '@onlook/ui/card';
import { motion } from 'motion/react';
import { ProgressWithInterval } from '@onlook/ui/progress-with-interval';
import { useProjectCreation } from '../_context/project-creation-context';
import { Button } from '@onlook/ui/button';
import { StepContent, StepFooter, StepHeader } from './steps';

export const FinalizingProject = () => {
    const { isFinalizing, error, retry, cancel } = useProjectCreation();

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
                    {error ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <p>{error}</p>
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
                {error && (
                    <Button onClick={retry} disabled={isFinalizing}>
                        Retry
                    </Button>
                )}
            </StepFooter>
        </>
    );
};
