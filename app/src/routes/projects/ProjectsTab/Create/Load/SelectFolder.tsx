import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { getNameFromPath } from '@/routes/projects/helpers';
import { MinusCircledIcon } from '@radix-ui/react-icons';
import { StepProps } from '..';
import { MainChannels } from '/common/constants';

export const LoadSelectFolder = ({
    props: { projectData, setProjectData, currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    async function pickProjectFolder() {
        const path = (await window.api.invoke(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
            | string
            | null;

        if (path == null) {
            return;
        }
        setProjectData({
            ...projectData,
            folderPath: path,
            name: getNameFromPath(path),
        });
    }

    function verifyFolder() {
        window.api.invoke(MainChannels.VERIFY_PROJECT, projectData.folderPath);
        nextStep();
    }

    function handleClickPath() {
        window.api.invoke(MainChannels.OPEN_IN_EXPLORER, projectData.folderPath);
    }

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>{'Select your project folder'}</CardTitle>
                <CardDescription>{'This is where we’ll reference your App'}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-24 flex items-center w-full ">
                {projectData.folderPath ? (
                    <div className="w-full flex flex-row items-center border-[0.5px] bg-bg/60 px-4 py-5 rounded">
                        <div className="flex flex-col text-sm gap-1 break-all">
                            <p className="text-regularPlus">{projectData.name}</p>
                            <button
                                className="hover:underline text-mini text-text text-start"
                                onClick={handleClickPath}
                            >
                                {projectData.folderPath}
                            </button>
                        </div>
                        <Button
                            className="ml-auto w-10 h-10"
                            variant={'ghost'}
                            size={'icon'}
                            onClick={() => {
                                setProjectData({
                                    ...projectData,
                                    folderPath: undefined,
                                });
                            }}
                        >
                            <MinusCircledIcon />
                        </Button>
                    </div>
                ) : (
                    <Button
                        className="w-full h-20 text-regularPlus text-text border-[0.5px] bg-bg/50 hover:bg-bg/60"
                        variant={'outline'}
                        onClick={pickProjectFolder}
                    >
                        {'Click to select your folder'}
                    </Button>
                )}
            </CardContent>
            <CardFooter className="text-sm">
                <p className="text-text">{`${currentStep + 1} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={prevStep} variant="ghost">
                        Back
                    </Button>
                    <Button
                        disabled={!projectData.folderPath}
                        type="button"
                        onClick={verifyFolder}
                        variant="outline"
                    >
                        Next
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
