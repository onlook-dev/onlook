import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { sendAnalytics } from '@/lib/utils';
import { CreateMethod } from '@/routes/projects/helpers';
import type { CreateStage } from '@onlook/utils';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { StepProps } from '..';
import { MainChannels } from '/common/constants';

enum StepState {
    INSTALLING = 'installing',
    INSTALLED = 'installed',
    ERROR = 'error',
}

export const NewSetupProject = ({
    props: { projectData, setProjectData, currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [state, setState] = useState<StepState>(StepState.INSTALLING);
    const [progress, setProgress] = useState<number>(0);
    const [message, setMessage] = useState<string>('Installing project');

    useEffect(() => {
        window.api.on(
            MainChannels.CREATE_NEW_PROJECT_CALLBACK,
            ({ stage, message }: { stage: CreateStage; message: string }) => {
                setMessage(message);
                if (stage === 'cloning') {
                    setProgress(30);
                } else if (stage === 'installing') {
                    setProgress(80);
                } else if (stage === 'complete') {
                    setProgress(100);
                    setState(StepState.INSTALLED);
                } else if (stage === 'error') {
                    setState(StepState.ERROR);
                    sendAnalytics('create project error', { message, method: CreateMethod.NEW });
                }
            },
        );

        return () => {
            window.api.removeAllListeners(MainChannels.CREATE_NEW_PROJECT_CALLBACK);
        };
    }, []);

    function handleClickPath() {
        window.api.invoke(MainChannels.OPEN_IN_EXPLORER, projectData.folderPath);
    }

    function renderTitle() {
        if (state === StepState.INSTALLED) {
            return 'Your project is ready';
        }
        if (state === StepState.ERROR) {
            return 'Error creating project';
        }
        return 'Setting up project...';
    }

    function renderDescription(): string {
        if (state === StepState.INSTALLED) {
            return 'Open this project in Onlook any time to start designing';
        }
        if (state === StepState.ERROR) {
            return 'Please again or contact support';
        }
        return 'Installing the right files and folders for you.';
    }

    function renderMainContent() {
        if (state === StepState.INSTALLED) {
            return (
                <div className="w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-2 border-green-600 text-green-900 bg-green-100">
                    <div className={'flex flex-col text-sm gap-1 break-all'}>
                        <p className="text-regularPlus">{projectData.name}</p>
                        <button
                            className="hover:underline text-mini text-start"
                            onClick={handleClickPath}
                        >
                            {projectData.folderPath}
                        </button>
                    </div>
                    <CheckCircledIcon className="ml-auto" />
                </div>
            );
        } else if (state === StepState.ERROR) {
            return (
                <div className="text-sm w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-2 border-red-600 text-red-200 bg-red-900">
                    <p>{message}</p>
                </div>
            );
        }
        return (
            <div className="flex flex-col w-full gap-2 text-sm">
                <Progress value={progress} className="w-full" />
                <p>{message}</p>
            </div>
        );
    }

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>{renderTitle()}</CardTitle>
                <CardDescription>{renderDescription()}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-24 flex items-center w-full">
                {renderMainContent()}
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep + 1} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={prevStep} variant="ghost">
                        {state === StepState.INSTALLING ? 'Cancel' : 'Back'}
                    </Button>
                    <Button
                        disabled={state === StepState.INSTALLING || state === StepState.ERROR}
                        variant={'outline'}
                        onClick={nextStep}
                    >
                        {'Run Project'}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
