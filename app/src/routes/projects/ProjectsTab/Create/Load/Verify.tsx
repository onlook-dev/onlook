import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { SetupStage, VerifyStage } from '@onlook/utils';
import { CheckCircledIcon, ExclamationTriangleIcon, ShadowIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { StepProps } from '..';
import { MainChannels } from '/common/constants';

enum StepState {
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
    const [state, setState] = useState<StepState>(StepState.VERIFYING);
    const [progressMessage, setProgressMessage] = useState<string>('Starting...');

    useEffect(() => {
        if (!projectData.folderPath) {
            throw new Error('Folder path is not provided');
        }
        window.api.on(
            MainChannels.VERIFY_PROJECT_CALLBACK,
            ({ stage, message }: { stage: VerifyStage; message: string }) => {
                setProgressMessage(message);
                if (stage === 'checking') {
                    setState(StepState.VERIFYING);
                } else if (stage === 'not_installed') {
                    setState(StepState.NOT_INSTALLED);
                } else if (stage === 'installed') {
                    setState(StepState.INSTALLED);
                } else if (stage === 'error') {
                    setState(StepState.ERROR);
                }
            },
        );
        window.api.on(
            MainChannels.SETUP_PROJECT_CALLBACK,
            ({ stage, message }: { stage: SetupStage; message: string }) => {
                setProgressMessage(message);
                if (stage === 'installing' || stage === 'configuring') {
                    setState(StepState.INSTALLING);
                } else if (stage === 'complete') {
                    setState(StepState.INSTALLED);
                } else if (stage === 'error') {
                    setState(StepState.ERROR);
                }
            },
        );
        return () => {
            window.api.removeAllListeners(MainChannels.VERIFY_PROJECT_CALLBACK);
            window.api.removeAllListeners(MainChannels.SETUP_PROJECT_CALLBACK);
        };
    }, [projectData.folderPath]);

    async function installOnlook() {
        setState(StepState.INSTALLING);

        window.api.invoke(MainChannels.SETUP_PROJECT, projectData.folderPath);
    }

    function handleSelectDifferentFolder() {
        setProjectData({ folderPath: undefined });
        prevStep();
    }

    function handleClickPath() {
        window.api.invoke(MainChannels.OPEN_IN_EXPLORER, projectData.folderPath);
    }

    function renderMainContent() {
        if (state === StepState.INSTALLING || state === StepState.VERIFYING) {
            return (
                <div className="w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-2">
                    <ShadowIcon className="animate-spin" />
                    <p className="text-sm">{progressMessage}</p>
                </div>
            );
        }

        function boxDecoration() {
            if (state === StepState.INSTALLED) {
                return 'border-green-600 text-green-900 bg-green-100';
            } else if (state === StepState.NOT_INSTALLED) {
                return 'border-yellow-700 text-yellow-900 bg-yellow-100';
            } else if (state === StepState.ERROR) {
                return 'border-red-600 text-red-100 bg-red-900';
            }
        }

        return (
            <div
                className={clsx(
                    'w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-1',
                    boxDecoration(),
                )}
            >
                <div className={'flex flex-col text-sm gap-1 break-all'}>
                    <p className="text-regularPlus">{projectData.name}</p>
                    <button className="hover:underline text-mini" onClick={handleClickPath}>
                        {projectData.folderPath}
                    </button>
                </div>
                {state === StepState.INSTALLED ? (
                    <CheckCircledIcon className="ml-auto" />
                ) : (
                    <ExclamationTriangleIcon className="ml-auto" />
                )}
            </div>
        );
    }

    function renderTitle() {
        if (state === StepState.VERIFYING) {
            return 'Verifying project...';
        } else if (state === StepState.INSTALLING) {
            return 'Setting up Onlook...';
        } else if (state === StepState.INSTALLED) {
            return 'Onlook is installed';
        } else if (state === StepState.NOT_INSTALLED) {
            return 'Onlook is not installed';
        } else if (state === StepState.ERROR) {
            return 'Something went wrong';
        }
    }

    function renderDescription() {
        if (state === StepState.VERIFYING) {
            return 'Checking your dependencies and configurations';
        } else if (state === StepState.INSTALLING) {
            return 'Setting up your dependencies and configurations';
        } else if (state === StepState.NOT_INSTALLED) {
            return 'It takes one second to install Onlook on your project';
        } else if (state === StepState.INSTALLED) {
            return 'Your project is all set up';
        } else {
            return progressMessage || 'Please try again or contact support';
        }
    }

    function renderPrimaryButton() {
        if (
            state === StepState.INSTALLING ||
            state === StepState.VERIFYING ||
            state === StepState.ERROR
        ) {
            return (
                <Button disabled variant={'outline'}>
                    {'Next'}
                </Button>
            );
        } else if (state === StepState.INSTALLED) {
            return (
                <Button variant={'outline'} onClick={nextStep}>
                    {'Next'}
                </Button>
            );
        } else if (state === StepState.NOT_INSTALLED) {
            return (
                <Button variant={'outline'} onClick={installOnlook}>
                    {'Install Onlook'}
                </Button>
            );
        }
    }

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>{renderTitle()}</CardTitle>
                <CardDescription>{renderDescription()}</CardDescription>
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
                    {renderPrimaryButton()}
                </div>
            </CardFooter>
        </Card>
    );
};
