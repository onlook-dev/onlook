import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { VerifyStage } from '@onlook/utils';
import { CheckCircledIcon, ExclamationTriangleIcon, ShadowIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { StepProps } from '..';
import { MainChannels } from '/common/constants';

export const LoadVerifyProject = ({
    props: { projectData, setProjectData, currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [isVerifying, setIsVerifying] = useState<boolean>(true);
    const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
    const [verifyMessage, setVerifyMessage] = useState<string>('Rummaging...');

    useEffect(() => {
        if (!projectData.folderPath) {
            throw new Error('Folder path is not provided');
        }
        window.api
            .invoke(MainChannels.VERIFY_PROJECT, projectData.folderPath)
            .then((isInstalled) => {
                setIsInstalled(isInstalled as boolean);
            });

        window.api.on(
            MainChannels.VERIFY_PROJECT_CALLBACK,
            ({ stage, message }: { stage: VerifyStage; message: string }) => {
                setVerifyMessage(message);
                if (stage === 'checking') {
                    setIsVerifying(true);
                    setIsInstalled(false);
                } else if (stage === 'complete') {
                    setIsVerifying(false);
                }
            },
        );
        return () => {
            window.api.removeAllListeners(MainChannels.VERIFY_PROJECT_CALLBACK);
        };
    }, []);

    async function installOnlook() {
        setIsInstalled(true);
    }

    function handleSelectDifferentFolder() {
        setProjectData({ folderPath: undefined });
        prevStep();
    }

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>
                    {isVerifying
                        ? 'Verifying project...'
                        : isInstalled
                          ? 'Onlook is installed'
                          : 'Onlook is not installed'}
                </CardTitle>
                <CardDescription>
                    {isVerifying
                        ? 'Checking your dependencies and configurations'
                        : isInstalled
                          ? 'Your project is all set up'
                          : 'It takes one second to install Onlook on your project'}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-24 flex items-center w-full">
                {isVerifying ? (
                    <div className="w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-2">
                        <ShadowIcon className="animate-spin" />
                        <p className="text-sm">{verifyMessage}</p>
                    </div>
                ) : (
                    <div
                        className={clsx(
                            'w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-1',
                            isInstalled
                                ? 'border-green-600 text-green-900 bg-green-100'
                                : 'border-yellow-700 text-yellow-900 bg-yellow-100',
                        )}
                    >
                        <div className={'flex flex-col text-sm'}>
                            <p className="text-regularPlus">{projectData.name}</p>
                            <p className="text-mini">{projectData.folderPath}</p>
                        </div>
                        {isInstalled ? (
                            <CheckCircledIcon className="ml-auto" />
                        ) : (
                            <ExclamationTriangleIcon className="ml-auto" />
                        )}
                    </div>
                )}
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep + 1} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={handleSelectDifferentFolder} variant="ghost">
                        Select a different folder
                    </Button>

                    {isVerifying ? (
                        <Button disabled variant={'outline'}>
                            {'Next'}
                        </Button>
                    ) : isInstalled ? (
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
