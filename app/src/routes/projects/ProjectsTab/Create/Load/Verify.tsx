import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { CheckCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { useState } from 'react';
import { StepProps } from '..';

export const LoadVerifyProject = ({
    props: { projectData, setProjectData, currentStep, totalSteps, prevStep, nextStep },
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
            <CardContent className="min-h-24 flex items-center w-full">
                <div
                    className={clsx(
                        'w-full flex flex-row items-center border border-[0.5px] p-4 rounded gap-1',
                        isInstalled
                            ? 'border-green-600 text-green-900 bg-green-100'
                            : 'border-yellow-700 text-yellow-900 bg-yellow-100',
                    )}
                >
                    <div className={'flex flex-col text-sm gap-1 break-all'}>
                        <p className="text-regularPlus">{projectData.name}</p>
                        <p className="text-mini">{projectData.folderPath}</p>
                    </div>
                    {isInstalled ? (
                        <CheckCircledIcon className="ml-auto w-10 h-10" />
                    ) : (
                        <ExclamationTriangleIcon className="ml-auto w-10 h-10" />
                    )}
                </div>
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep + 1} of ${totalSteps}`}</p>
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
