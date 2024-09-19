import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { MinusCircledIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { StepProps } from '..';
import { MainChannels } from '/common/constants';

export const LoadSelectFolder = ({
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
                <p>{`${currentStep + 1} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={prevStep} variant="ghost">
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
