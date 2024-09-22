import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { VerifyStage } from '@onlook/utils';
import { CheckCircledIcon, ExclamationTriangleIcon, ShadowIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { StepProps } from '..';
import { MainChannels } from '/common/constants';

enum VerifyState {
    VERIFYING = 'verifying',
    INSTALLING = 'installing',
    INSTALLED = 'installed',
    NOT_INSTALLED = 'not_installed',
    ERROR = 'error',
}

export const LoadVerifyProject = ({
    props: { projectData, setProjectData, currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [state, setState] = useState<VerifyState>(VerifyState.VERIFYING);
    const [progressMessage, setProgressMessage] = useState<string>('Starting...');

    useEffect(() => {
        if (!projectData.folderPath) {
            throw new Error('Folder path is not provided');
        }

        // TODO: This should be called at the end of the last stage
        window.api.invoke(MainChannels.VERIFY_PROJECT, projectData.folderPath);

        window.api.on(
            MainChannels.VERIFY_PROJECT_CALLBACK,
            ({ stage, message }: { stage: VerifyStage; message: string }) => {
                setProgressMessage(message);
                if (stage === 'checking') {
                    setState(VerifyState.VERIFYING);
                } else if (stage === 'not_installed') {
                    setState(VerifyState.NOT_INSTALLED);
                } else if (stage === 'installed') {
                    setState(VerifyState.INSTALLED);
                }
            },
        );
        return () => {
            window.api.removeAllListeners(MainChannels.VERIFY_PROJECT_CALLBACK);
        };
    }, [projectData.folderPath]);

    async function installOnlook() {
        setState(VerifyState.INSTALLING);

        window.api
            .invoke(MainChannels.SETUP_PROJECT, projectData.folderPath)
            .then((isInstalled) => {
                if (isInstalled === true) {
                    setState(VerifyState.INSTALLED);
                } else {
                    toast({
                        title: 'Error installing Onlook',
                        description: 'Please try again or contact support',
                    });
                    setState(VerifyState.ERROR);
                }
            });

        window.api.on(
            MainChannels.SETUP_PROJECT_CALLBACK,
            ({ stage, message }: { stage: VerifyStage; message: string }) => {
                setProgressMessage(message);
                if (stage === 'checking') {
                    setState(VerifyState.INSTALLING);
                }
            },
        );
    }

    function handleSelectDifferentFolder() {
        setProjectData({ folderPath: undefined });
        prevStep();
    }

    function renderMainContent() {
        if (state === VerifyState.INSTALLING || state === VerifyState.VERIFYING) {
            return (
                <div className="w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-2">
                    <ShadowIcon className="animate-spin" />
                    <p className="text-sm">{progressMessage}</p>
                </div>
            );
        }

        return (
            <div
                className={clsx(
                    'w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-1',
                    state === VerifyState.INSTALLED
                        ? 'border-green-600 text-green-900 bg-green-100'
                        : 'border-yellow-700 text-yellow-900 bg-yellow-100',
                )}
            >
                <div className={'flex flex-col text-sm'}>
                    <p className="text-regularPlus">{projectData.name}</p>
                    <p className="text-mini">{projectData.folderPath}</p>
                </div>
                {state === VerifyState.INSTALLED ? (
                    <CheckCircledIcon className="ml-auto" />
                ) : (
                    <ExclamationTriangleIcon className="ml-auto" />
                )}
            </div>
        );
    }

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>
                    {state === VerifyState.VERIFYING
                        ? 'Verifying project...'
                        : state === VerifyState.INSTALLED
                          ? 'Onlook is installed'
                          : 'Onlook is not installed'}
                </CardTitle>
                <CardDescription>
                    {state === VerifyState.VERIFYING
                        ? 'Checking your dependencies and configurations'
                        : state === VerifyState.INSTALLED
                          ? 'Your project is all set up'
                          : 'It takes one second to install Onlook on your project'}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-24 flex items-center w-full">
                {renderMainContent()}
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep + 1} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={handleSelectDifferentFolder} variant="ghost">
                        Select a different folder
                    </Button>

                    {state === VerifyState.INSTALLING || state === VerifyState.VERIFYING ? (
                        <Button disabled variant={'outline'}>
                            {'Next'}
                        </Button>
                    ) : state === VerifyState.INSTALLED ? (
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
