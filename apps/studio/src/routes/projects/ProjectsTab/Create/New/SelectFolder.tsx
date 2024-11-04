import { invokeMainChannel, platformSlash } from '@/lib/utils';
import { getFolderNameAndTargetPath } from '@/routes/projects/helpers';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { StepComponent } from '../withStepProps';

const NewSelectFolder: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, prevStep, nextStep } = props;

    async function pickProjectFolder() {
        const path = (await invokeMainChannel(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
            | string
            | null;
        if (path == null) {
            return;
        }
        const pathWithProject = `${path}${platformSlash}${nameToFolderName(projectData.name || 'new-project')}`;
        setProjectData({ ...projectData, folderPath: pathWithProject });
    }

    function nameToFolderName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/^(\d)/, '_$1');
    }

    function handleSetupProject() {
        if (!projectData.folderPath) {
            console.error('Folder path is missing');
            return;
        }
        const { name, path } = getFolderNameAndTargetPath(projectData.folderPath);
        invokeMainChannel(MainChannels.CREATE_NEW_PROJECT, { name, path });
        nextStep();
    }

    const renderHeader = () => (
        <>
            <CardTitle>{'Select your project folder'}</CardTitle>
            <CardDescription>{"We'll create a folder for your new app here"}</CardDescription>
        </>
    );

    const renderContent = () => (
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <AnimatePresence mode="popLayout">
                {projectData.folderPath ? (
                    <motion.div
                        key="folderPath"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full flex flex-row items-center border px-4 py-5 rounded bg-background-onlook gap-2"
                    >
                        <div className="flex flex-col gap-1 break-all">
                            <p className="text-regular">{projectData.name}</p>
                            <p className="text-mini text-foreground-onlook">
                                {projectData.folderPath}
                            </p>
                        </div>
                        <Button
                            className="ml-auto w-10 h-10"
                            variant={'ghost'}
                            size={'icon'}
                            onClick={() =>
                                setProjectData({ ...projectData, folderPath: undefined })
                            }
                        >
                            <Icons.MinusCircled />
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="selectFolder"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full"
                    >
                        <Button
                            className="w-full h-32 text-regularPlus text-foreground-onlook border-[0.5px] bg-background-onlook/50 hover:bg-background-onlook/60"
                            variant={'outline'}
                            onClick={pickProjectFolder}
                        >
                            {'Click to select a folder'}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </MotionConfig>
    );

    const renderFooter = () => (
        <>
            <Button type="button" onClick={prevStep} variant="ghost">
                Back
            </Button>
            <Button
                disabled={!projectData.folderPath}
                type="button"
                onClick={handleSetupProject}
                variant="outline"
            >
                {projectData.folderPath ? 'Set up project' : 'Next'}
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

NewSelectFolder.Header = (props) => <NewSelectFolder props={props} variant="header" />;
NewSelectFolder.Content = (props) => <NewSelectFolder props={props} variant="content" />;
NewSelectFolder.Footer = (props) => <NewSelectFolder props={props} variant="footer" />;
NewSelectFolder.Header.displayName = 'NewSelectFolder.Header';
NewSelectFolder.Content.displayName = 'NewSelectFolder.Content';
NewSelectFolder.Footer.displayName = 'NewSelectFolder.Footer';

export { NewSelectFolder };
