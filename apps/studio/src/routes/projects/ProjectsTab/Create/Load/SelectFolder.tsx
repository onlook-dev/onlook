import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { getNameFromPath } from '@/routes/projects/helpers';
import type { StepComponent } from '../withStepProps';
import { MainChannels } from '@onlook/models/constants';
import { Icons } from '@onlook/ui/icons';

const LoadSelectFolder: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, prevStep, nextStep } = props;

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

    const renderHeader = () => (
        <>
            <CardTitle>{'Select your project folder'}</CardTitle>
            <CardDescription>{"This is where we'll reference your App"}</CardDescription>
        </>
    );

    const renderContent = () => (
        <>
            {projectData.folderPath ? (
                <div className="w-full flex flex-row items-center border-[0.5px] bg-background-onlook/60 px-4 py-5 rounded">
                    <div className="flex flex-col text-sm gap-1 break-all">
                        <p className="text-regularPlus">{projectData.name}</p>
                        <button
                            className="hover:underline text-mini text-foreground-onlook text-start"
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
                        <Icons.MinusCircled />
                    </Button>
                </div>
            ) : (
                <Button
                    className="w-full h-32 text-regularPlus text-foreground-onlook border-[0.5px] bg-background-onlook/50 hover:bg-background-onlook/60"
                    variant={'outline'}
                    onClick={pickProjectFolder}
                >
                    {'Click to select your folder'}
                </Button>
            )}
        </>
    );

    const renderFooter = () => (
        <>
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
        </>
    );

    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

LoadSelectFolder.Header = (props) => <LoadSelectFolder props={props} variant="header" />;
LoadSelectFolder.Content = (props) => <LoadSelectFolder props={props} variant="content" />;
LoadSelectFolder.Footer = (props) => <LoadSelectFolder props={props} variant="footer" />;
LoadSelectFolder.Header.displayName = 'LoadSelectFolder.Header';
LoadSelectFolder.Content.displayName = 'LoadSelectFolder.Content';
LoadSelectFolder.Footer.displayName = 'LoadSelectFolder.Footer';

export { LoadSelectFolder };
