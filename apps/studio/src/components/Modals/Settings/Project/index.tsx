import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { ReinstallButton } from './ReinstallButon';
import { toast } from '@onlook/ui/use-toast';
import { useTranslation } from 'react-i18next';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { useState } from 'react';
import { RunState } from '@onlook/models';

type MoveProjectFolderResponse = {
    success: boolean;
    message: string;
};

const ProjectTab = observer(() => {
    const projectsManager = useProjectsManager();
    const project = projectsManager.project;

    const installCommand = project?.commands?.install || DefaultSettings.COMMANDS.install;
    const runCommand = project?.commands?.run || DefaultSettings.COMMANDS.run;
    const buildCommand = project?.commands?.build || DefaultSettings.COMMANDS.build;
    const folderPath = project?.folderPath || '';
    const name = project?.name || '';
    const url = project?.url || '';

    const runner = projectsManager.runner;
    const [showPathUpdateAlert, setShowPathUpdateAlert] = useState<boolean>(false);
    const [copyPath, setCopyPath] = useState<string>('');
    const { t } = useTranslation();

    const handleUpdatePath = async () => {
        const path = (await invokeMainChannel(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
            | string
            | null;

        if (!path || path === project?.folderPath) {
            console.error('No path selected');
            return;
        }
        setCopyPath(path);
        setShowPathUpdateAlert(true);
    };

    const cancelUpdatePath = async () => {
        setCopyPath('');
        setShowPathUpdateAlert(false);
    };

    const confirmUpdatePath = async () => {
        try {
            if (runner?.state === RunState.RUNNING || runner?.state === RunState.SETTING_UP) {
                runner?.stop();
                return;
            }

            const result: MoveProjectFolderResponse = await invokeMainChannel(
                MainChannels.MOVE_PROJECT_FOLDER,
                {
                    currentPath: project?.folderPath,
                    newPath: copyPath,
                },
            );

            console.log('This is the args values from the backend : ', result);

            if (!result.success) {
                throw new Error(result.message);
            }

            projectsManager.updatePartialProject({
                folderPath: copyPath,
            });

            toast({
                title: `${t('projects.dialogs.updatePath.success')}`,
                variant: 'warning',
            });

            setShowPathUpdateAlert(false);
            console.log('Your control is now in the confirmUpdatePath function ;)');
            console.log('Keep going');
        } catch (error) {
            toast({
                title: `${t('projects.dialogs.updatePath.error')}`,
                variant: 'destructive',
            });
            setShowPathUpdateAlert(false);
            console.error(error);
        }
    };

    return (
        <>
            <div className="text-sm">
                <div className="flex flex-col gap-4 p-6">
                    <h2 className="text-lg">Metadata</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className=" text-muted-foreground">Name</p>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) =>
                                    projectsManager.updatePartialProject({
                                        name: e.target.value,
                                    })
                                }
                                className="w-2/3"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <p className=" text-muted-foreground">URL</p>
                            <Input
                                id="url"
                                value={url}
                                onChange={(e) =>
                                    projectsManager.updatePartialProject({
                                        url: e.target.value,
                                    })
                                }
                                className="w-2/3"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <p className=" text-muted-foreground">Path</p>
                            <div className="flex items-center gap-2 w-2/3">
                                <Input
                                    id="folderPath"
                                    value={folderPath}
                                    readOnly={true}
                                    onChange={(e) =>
                                        projectsManager.updatePartialProject({
                                            folderPath: e.target.value,
                                        })
                                    }
                                />
                                <Button
                                    size={'icon'}
                                    variant={'outline'}
                                    onClick={handleUpdatePath}
                                >
                                    <Icons.Directory />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-4 p-6">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-lg">Commands</h2>
                        <p className="text-small text-foreground-secondary">
                            {"Only update these if you know what you're doing!"}
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-muted-foreground">Install</p>
                            <Input
                                id="install"
                                value={installCommand}
                                className="w-2/3"
                                onChange={(e) =>
                                    projectsManager.updatePartialProject({
                                        commands: {
                                            ...project?.commands,
                                            install: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <p className=" text-muted-foreground">Run</p>
                            <Input
                                id="run"
                                value={runCommand}
                                className="w-2/3"
                                onChange={(e) =>
                                    projectsManager.updatePartialProject({
                                        commands: {
                                            ...project?.commands,
                                            run: e.target.value,
                                        },
                                    })
                                }
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <p className=" text-muted-foreground">Build</p>
                            <Input
                                id="build"
                                value={buildCommand}
                                onChange={(e) =>
                                    projectsManager.updatePartialProject({
                                        commands: {
                                            ...project?.commands,
                                            build: e.target.value,
                                        },
                                    })
                                }
                                className="w-2/3"
                            />
                        </div>
                    </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center p-6">
                    <div className="flex flex-col gap-2">
                        <p className="text-largePlus">Reinstall Dependencies</p>
                        <p className="text-foreground-onlook text-small">
                            For when project failed to install dependencies
                        </p>
                    </div>
                    <ReinstallButton />
                </div>
            </div>

            <AlertDialog open={showPathUpdateAlert} onOpenChange={setShowPathUpdateAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('projects.dialogs.updatePath.title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('projects.dialogs.updatePath.description')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant={'ghost'} onClick={cancelUpdatePath}>
                            {t('projects.actions.cancel')}
                        </Button>
                        <Button variant={'destructive'} onClick={confirmUpdatePath}>
                            {t('projects.actions.confirm')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
});

export default ProjectTab;
