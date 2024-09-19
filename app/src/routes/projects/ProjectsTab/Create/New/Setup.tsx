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
import { CheckCircledIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { StepProps } from '..';

export const NewSetupProject = ({
    props: { currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [isInstalling, setIsInstalling] = useState<boolean | null>(false);
    const [progress, setProgress] = useState<number>(0);

    useEffect(() => {
        if (progress >= 100) {
            setIsInstalling(false);
        } else {
            setTimeout(() => {
                setProgress(progress + 10);
            }, 1000);
        }
    }, [progress]);

    async function installOnlook() {
        setIsInstalling(true);
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
            <CardContent className="h-24 flex items-center w-full">
                {isInstalling ? (
                    <div className="flex flex-col">
                        <Progress value={progress} className="w-full" />
                        <p>Installing dependencies...</p>
                    </div>
                ) : (
                    <div className="w-full flex flex-row items-center border p-4 rounded border-green-600 text-green-600 bg-green-100">
                        <div className={'flex flex-col text-sm'}>
                            <p>{'projectName'}</p>
                            <p>{'projectPath'}</p>
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
