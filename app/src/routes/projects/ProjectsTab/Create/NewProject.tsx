import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { MinusCircledIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { ProjectData } from '.';
import { MainChannels } from '/common/constants';

interface StepProps {
    formData: ProjectData;
    setProjectData: (data: ProjectData) => void;
    currentStep: number;
    totalSteps: number;
    prevStep: () => void;
    nextStep: () => void;
}

export const NewSelectFolderStep = ({
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
                    <Button type="button" onClick={prevStep} variant="outline">
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

export const NewStep2 = ({
    formData,
    setProjectData,
}: {
    formData: ProjectData;
    setProjectData: (data: ProjectData) => void;
}) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Step 2: React Setup</h2>
        <select
            value={formData.reactVersion}
            onChange={(e) => setProjectData({ ...formData, reactVersion: e.target.value })}
            className="w-full p-2 border rounded"
        >
            <option value="">Select React Version</option>
            <option value="18">React 18</option>
            <option value="17">React 17</option>
            <option value="16">React 16</option>
        </select>
    </div>
);
