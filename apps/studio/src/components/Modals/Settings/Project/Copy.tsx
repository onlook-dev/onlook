import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import { MainChannels } from '@onlook/models/constants';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import { toast } from '@onlook/ui/use-toast';
import { t } from 'i18next';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { RunState } from '@onlook/models';
import { Progress } from '@onlook/ui/progress';
import { Checkbox } from '@onlook/ui/checkbox';
import { Label } from '@onlook/ui/label';

const Copy = observer(() => {
    const projectsManager = useProjectsManager();
    const project = projectsManager.project;
    const folderPath = project?.folderPath || '';
    const state = projectsManager.copy.copyStage;
    const isTerminalRunning = projectsManager.runner?.state === RunState.RUNNING;
    const [showWarningModal, setWarningModal] = useState<boolean>(false);
    const [updatedPath, setUpdatedPath] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [createCopy, setCreateCopy] = useState<boolean>(false);

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

            if (projectsManager.runner?.state === RunState.RUNNING) {
                await projectsManager.runner?.stop();
            }

            if (createCopy) {
                setIsLoading(true);
                await projectsManager.copy.createCopy(updatedPath);
            }
            projectsManager.updatePartialProject({
                folderPath: updatedPath,
            });
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

    return (
        <>
            <div className="flex justify-between items-center">
                <p className=" text-muted-foreground">Path</p>
                <div className="flex items-center gap-2 w-2/3">
                    <Input id="folderPath" value={folderPath} readOnly={true} />
                    <Button size={'icon'} variant={'outline'} onClick={handleUpdatePath}>
                        <Icons.Directory />
                    </Button>
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
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="createCopy"
                            checked={createCopy}
                            onCheckedChange={(checked) => setCreateCopy(checked as boolean)}
                        />
                        <Label htmlFor="createCopy">
                            {t('projects.copy.warningModal.createCopy')}
                        </Label>
                    </div>
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

export default Copy;
