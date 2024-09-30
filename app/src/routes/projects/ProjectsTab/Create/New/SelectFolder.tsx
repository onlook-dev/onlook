import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { getFolderNameAndTargetPath } from '@/routes/projects/helpers';
import { MinusCircledIcon } from '@radix-ui/react-icons';
import { StepProps } from '..';
import { MainChannels } from '/common/constants';

export const NewSelectFolder = ({
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

        const pathWithProject = `${path}/${nameToFolderName(projectData.name || 'new-project')}`;
        setProjectData({
            ...projectData,
            folderPath: pathWithProject,
        });
    }

    function nameToFolderName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric characters with hyphens
            .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
            .replace(/^(\d)/, '_$1'); // Prepend underscore if the name starts with a digit
    }

    function goBack() {
        setProjectData({
            ...projectData,
            folderPath: undefined,
        });
        prevStep();
    }

    function handleSetupProject() {
        if (!projectData.folderPath) {
            console.error('Folder path is missing');
            return;
        }
        const { name, path } = getFolderNameAndTargetPath(projectData.folderPath);
        window.api.invoke(MainChannels.CREATE_NEW_PROJECT, {
            name,
            path,
        });
        nextStep();
    }

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>{'Select your project folder'}</CardTitle>
                <CardDescription>{"We'll create a folder with your new app here"}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-24 flex items-center w-full">
                {projectData.folderPath ? (
                    <div className="w-full flex flex-row items-center border px-4 py-5 rounded bg-bg gap-2">
                        <div className="flex flex-col gap-1 break-all">
                            <p className="text-regular">{projectData.name}</p>
                            <p className="text-mini text-text">{projectData.folderPath}</p>
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
                        className="w-full h-20 text-regularPlus text-text bg-bg/50"
                        variant={'outline'}
                        onClick={pickProjectFolder}
                    >
                        {'Click to select your folder'}
                    </Button>
                )}
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep + 1} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={goBack} variant="ghost">
                        Rename folder
                    </Button>
                    <Button
                        disabled={!projectData.folderPath}
                        type="button"
                        onClick={handleSetupProject}
                        variant="outline"
                    >
                        {projectData.folderPath ? 'Set up project' : 'Next'}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
