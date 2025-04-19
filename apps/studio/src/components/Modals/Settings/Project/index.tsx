import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { RunState } from '@onlook/models';
import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { ReinstallButton } from './ReinstallButon';
import { useEffect, useMemo, useState } from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';

import { toast } from '@onlook/ui/use-toast';
import { Progress } from '@onlook/ui/progress';
import { t } from 'i18next';

// type MoveProjectFolderResponse = {
//     success: boolean;
//     message: string;
// };

const ProjectTab = observer(() => {
    const projectsManager = useProjectsManager();
    const project = projectsManager.project;

    const installCommand = project?.commands?.install || DefaultSettings.COMMANDS.install;
    const runCommand = project?.commands?.run || DefaultSettings.COMMANDS.run;
    const buildCommand = project?.commands?.build || DefaultSettings.COMMANDS.build;
    const folderPath = project?.folderPath || '';
    const name = project?.name || '';
    const url = project?.url || '';
    const state = projectsManager.copy.copyStage;
    const isTerminalRunning = projectsManager.runner?.state === RunState.RUNNING;

    const [showWarningModal, setWarningModal] = useState<boolean>(false);
    const [updatedPath, setUpdatedPath] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        return () => {
            window.api.removeAllListeners(MainChannels.UPDATE_PROJECT_PATH);
        };
    }, []);

    const loadingStatus: { status: string; message: string } = useMemo(() => {
        switch (state) {
            case 'Starting...': {
                return {
                    status: t('projects.copy.loadingModal.status.starting'),
                    message: t('projects.copy.loadingModal.message.starting'),
                };
            }
            case 'Copying...': {
                return {
                    status: t('projects.copy.loadingModal.status.copying'),
                    message: t('projects.copy.loadingModal.message.copying'),
                };
            }
            case 'Complete': {
                return {
                    status: t('projects.copy.loadingModal.status.complete'),
                    message: t('projects.copy.loadingModal.message.complete'),
                };
            }
            case 'Error': {
                return {
                    status: t('projects.copy.loadingModal.status.error'),
                    message: t('projects.copy.loadingModal.message.error'),
                };
            }
            default: {
                return {
                    status: t('projects.copy.loadingModal.status.copying'),
                    message: t('projects.copy.loadingModal.message.copying'),
                };
            }
        }
    }, [state]);

    const progress = useMemo(() => {
        switch (state) {
            case 'Starting...': {
                return 30;
            }
            case 'Copying...': {
                return 60;
            }
            case 'Complete': {
                return 100;
            }
            case 'Error': {
                return 0;
            }
        }
    }, [state]);

    const handleUpdatePath = async () => {
        const path = (await invokeMainChannel(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
            | string
            | null;

        if (!path || folderPath === path) {
            console.error('No path selected');
            return;
        }

        setUpdatedPath(path);
        setWarningModal(true);
    };

    const cancelMoveFolder = () => {
        setUpdatedPath('');
        setWarningModal(false);
    };

    const confirmMoveFolder = async () => {
        try {
            setWarningModal(false);
            setIsLoading(true);
            await projectsManager.copy.createCopy(updatedPath);
            toast({
                title: t('projects.copy.toasts.success.title'),
                description: t('projects.copy.toasts.success.description'),
                variant: 'warning',
            });
        } catch (error) {
            toast({
                title: t('projects.copy.toasts.error.title'),
                description: t('projects.copy.toasts.error.description'),
                variant: 'destructive',
            });
            console.error(error);
        }
    };

    const handleUpdateUrl = (url: string) => {
        projectsManager.updatePartialProject({
            url,
        });
        projectsManager.editorEngine?.canvas.saveFrames(
            projectsManager.editorEngine?.canvas.frames.map((frame) => ({
                ...frame,
                url,
            })),
        );
    };

    return (
        <>
            <div className="text-sm">
                <div className="flex flex-col gap-4 p-6 text-sm">
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
                                onChange={(e) => handleUpdateUrl(e.target.value)}
                                className="w-2/3"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <p className=" text-muted-foreground">Path</p>
                            <div className="flex items-center gap-2 w-2/3">
                                <Input id="folderPath" value={folderPath} readOnly={true} />
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
            </div>
            <AlertDialog open={showWarningModal} onOpenChange={setWarningModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('projects.copy.warningModal.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isTerminalRunning
                                ? t('projects.copy.warningModal.instanceRunning')
                                : t('projects.copy.warningModal.instanceNotRunning')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="ghost" onClick={cancelMoveFolder}>
                            {t('projects.copy.warningModal.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={confirmMoveFolder}>
                            {t('projects.copy.warningModal.confirm')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isLoading} onOpenChange={setIsLoading}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <span>{t('projects.copy.loadingModal.title')}</span>
                            <span>
                                <p className="text-sm font-normal text-muted-foreground mt-2 mb-4">
                                    {loadingStatus.message}
                                </p>
                            </span>
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {/* <div className="mb-4"></div> */}
                            <Progress value={progress} className="w-full" />
                            <p className="mt-2">{loadingStatus.status}</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button
                            disabled={state === 'Starting...' || state === 'Copying...'}
                            variant="secondary"
                            onClick={() => setIsLoading(false)}
                        >
                            {t('projects.copy.loadingModal.finish')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
});

export default ProjectTab;
