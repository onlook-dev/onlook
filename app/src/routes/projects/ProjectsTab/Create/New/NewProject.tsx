import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MinusCircledIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { StepProps } from '..';
import { MainChannels } from '/common/constants';

export const NewNameProjectStep = ({
    props: { currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [projectName, setProjectName] = useState<string | null>(null);

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>{'Let’s name your project'}</CardTitle>
                <CardDescription>
                    {'We’ll set you up with a blank template to start designing'}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-24 flex items-center w-full">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="text">Project Name</Label>
                    <Input
                        type="text"
                        placeholder="My awesome project"
                        onInput={(e) => setProjectName(e.currentTarget.value)}
                    />
                </div>
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={prevStep} variant="ghost">
                        Back
                    </Button>
                    <Button
                        disabled={!projectName || projectName.length === 0}
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

export const NewSelectFolderFolderStep = ({
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
                    <Button type="button" onClick={prevStep} variant="ghost">
                        Rename folder
                    </Button>
                    <Button
                        disabled={!projectPath}
                        type="button"
                        onClick={nextStep}
                        variant="outline"
                    >
                        {projectPath ? 'Set up project' : 'Next'}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
