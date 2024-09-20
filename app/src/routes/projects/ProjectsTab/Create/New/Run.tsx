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
import { ClipboardCopyIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { StepProps } from '..';

export const NewRunProject = ({
    props: { projectData, setProjectData, currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const codeContent = `cd ${projectData.folderPath} && npm run dev`;

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
    }

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>{'Run your project'}</CardTitle>
                <CardDescription>
                    {'Run this command in your command line to start'}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-24 flex items-center w-full">
                <div className="border bg-gray-100 w-full rounded-lg p-4 flex flex-row gap-4 items-center">
                    <code className="text-sm overflow-scroll text-nowrap">{codeContent}</code>
                    <Button
                        className="ml-auto flex-inital w-14"
                        onClick={() => {
                            copyToClipboard(codeContent);
                            setIsRunning(true);
                            toast({ title: 'Copied to clipboard' });
                        }}
                        variant={'secondary'}
                        size={'icon'}
                    >
                        <ClipboardCopyIcon />
                    </Button>
                </div>
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep + 1} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={prevStep} variant="ghost">
                        Back
                    </Button>
                    <Button
                        disabled={!isRunning}
                        type="button"
                        onClick={nextStep}
                        variant="outline"
                    >
                        Complete Setup
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
