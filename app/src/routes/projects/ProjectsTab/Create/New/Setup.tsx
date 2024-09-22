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
import type { CreateStage } from '@onlook/utils';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { StepProps } from '..';
import { MainChannels } from '/common/constants';

export const NewSetupProject = ({
    props: { projectData, setProjectData, currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [isInstalling, setIsInstalling] = useState<boolean | null>(true);
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
                    setIsInstalling(false);
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

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>
                    {isInstalling ? 'Setting up project...' : 'Your project is ready'}
                </CardTitle>
                <CardDescription>
                    {isInstalling
                        ? 'Installing the right files and folders for you.'
                        : 'Open this project in Onlook any time to start designing'}
                </CardDescription>
            </CardHeader>
            <CardContent className="min-h-24 flex items-center w-full">
                {isInstalling ? (
                    <div className="flex flex-col w-full gap-2 text-sm">
                        <Progress value={progress} className="w-full" />
                        <p>{message}</p>
                    </div>
                ) : (
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
                )}
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep + 1} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    {isInstalling && (
                        <Button type="button" onClick={prevStep} variant="ghost">
                            Cancel
                        </Button>
                    )}
                    <Button disabled={!!isInstalling} variant={'outline'} onClick={nextStep}>
                        {'Run Project'}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
