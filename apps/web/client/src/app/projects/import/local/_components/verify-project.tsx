'use client';

import { type NextJsProjectValidation } from '@/app/projects/types';
import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { StepContent, StepFooter, StepHeader } from '../../steps';
import { useProjectCreation } from '../_context';

export const VerifyProject = () => {
    const { projectData, prevStep, nextStep, isFinalizing, validateNextJsProject } = useProjectCreation();
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
                        {"We're checking to make sure this project can work with Onlook"}
                    </CardDescription>
                </>
            );
        }
        if (validation?.isValid) {
            return (
                <>
                    <CardTitle>{'Project verified'}</CardTitle>
                    <CardDescription>{'Your project is ready to import to Onlook'}</CardDescription>
                </>
            );
        } else {
            return (
                <>
                    <CardTitle>{"This project won't work with Onlook"}</CardTitle>
                    <CardDescription>
                        {'Onlook only works with NextJS + React + Tailwind projects'}
                    </CardDescription>
                </>
            );
        }
    };

    return (
        <>
            <StepHeader>{renderHeader()}</StepHeader>
            <StepContent>
                <motion.div
                    key="name"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full"
                >
                    {validation?.isValid ? validProject() : invalidProject()}
                </motion.div>
            </StepContent>
            <StepFooter>
                <Button onClick={prevStep} disabled={isFinalizing} variant="outline">
                    Cancel
                </Button>
                <Button className="px-3 py-2" onClick={validation?.isValid ? nextStep : prevStep} disabled={isFinalizing}>
                    {validation?.isValid ? 'Finish setup' : 'Select a different folder'}
                </Button>
            </StepFooter>
        </>
    );
};
