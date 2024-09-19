import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { CheckCircledIcon, ExclamationTriangleIcon, MinusCircledIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { useState } from 'react';
import { ProjectData } from '.';
import { MainChannels } from '/common/constants';

interface StepProps {
    formData: ProjectData;
    setProjectData: (data: ProjectData) => void;
    currentStep: number;
    totalSteps: number;
    prevStep: () => void;
    nextStep: () => void;
}

export const NewSelectFolderStep = ({
    props: { currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [projectName, setProjectName] = useState<string | null>(null);
    const [projectPath, setProjectPath] = useState<string | null>(null);

    async function pickProjectFolder() {
        const path = (await window.api.invoke(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
            | string
            | null;

        if (path == null) {
            return;
        }
        setProjectName('Project Name');
        setProjectPath('/path/to/project');
    }

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>{'Select your project folder'}</CardTitle>
                <CardDescription>{'This is where we’ll reference your App'}</CardDescription>
            </CardHeader>
            <CardContent className="h-24 flex items-center w-full">
                {projectPath ? (
                    <div className="w-full flex flex-row items-center border p-4 rounded">
                        <div className="flex flex-col text-sm">
                            <p>{projectName}</p>
                            <p>{projectPath}</p>
                        </div>
                        <Button
                            className="ml-auto"
                            variant={'ghost'}
                            size={'icon'}
                            onClick={() => {
                                setProjectPath(null);
                                setProjectName(null);
                            }}
                        >
                            <MinusCircledIcon />
                        </Button>
                    </div>
                ) : (
                    <Button className="w-full h-12" variant={'outline'} onClick={pickProjectFolder}>
                        {'Click to select your folder'}
                    </Button>
                )}
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={prevStep} variant="outline">
                        Back
                    </Button>
                    <Button
                        disabled={!projectPath}
                        type="button"
                        onClick={nextStep}
                        variant="outline"
                    >
                        Next
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

export const NewVerifyProjectStep = ({
    props: { currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [isInstalled, setIsInstalled] = useState<boolean | null>(null);

    async function installOnlook() {
        setIsInstalled(true);
    }

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>
                    {isInstalled ? 'Onlook is installed' : 'Onlook is not installed'}
                </CardTitle>
                <CardDescription>
                    {isInstalled
                        ? 'Your project is all set up'
                        : 'It takes one second to install Onlook on your project'}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-24 flex items-center w-full">
                <div
                    className={clsx(
                        'w-full flex flex-row items-center border p-4 rounded',
                        isInstalled
                            ? 'border-green-600 text-green-600 bg-green-100'
                            : 'border-yellow-700 text-yellow-700 bg-yellow-100',
                    )}
                >
                    <div className={'flex flex-col text-sm'}>
                        <p>{'projectName'}</p>
                        <p>{'projectPath'}</p>
                    </div>
                    {isInstalled ? (
                        <CheckCircledIcon className="ml-auto" />
                    ) : (
                        <ExclamationTriangleIcon className="ml-auto" />
                    )}
                </div>
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={prevStep} variant="ghost">
                        Select a different folder
                    </Button>
                    {isInstalled ? (
                        <Button variant={'outline'} onClick={nextStep}>
                            {'Next'}
                        </Button>
                    ) : (
                        <Button variant={'outline'} onClick={installOnlook}>
                            {'Install Onlook'}
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
};
