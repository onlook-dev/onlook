import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { RunState } from '@onlook/models/run';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { toast } from '@onlook/ui/use-toast';

const ProjectTab = observer(() => {
    const projectsManager = useProjectsManager();
    const project = projectsManager.project;
    const [isReinstalling, setIsReinstalling] = useState(false);
    const [showReinstallDialog, setShowReinstallDialog] = useState(false);

    const installCommand = project?.commands?.install || DefaultSettings.COMMANDS.install;
    const runCommand = project?.commands?.run || DefaultSettings.COMMANDS.run;
    const buildCommand = project?.commands?.build || DefaultSettings.COMMANDS.build;
    const folderPath = project?.folderPath || '';
    const name = project?.name || '';
    const url = project?.url || '';

    const isTerminalRunning = projectsManager.runner?.state === RunState.RUNNING;

    const handleUpdatePath = async () => {
        const path = (await invokeMainChannel(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
            | string
            | null;

        if (!path) {
            console.error('No path selected');
            return;
        }

        projectsManager.updatePartialProject({
            folderPath: path,
        });
    };

    const handleReinstallDependencies = async () => {
        if (!project?.folderPath) {
            toast({
                title: 'Error',
                description: 'Project path is not defined',
                variant: 'destructive',
            });
            return;
        }

        setIsReinstalling(true);

        try {
            await invokeMainChannel(MainChannels.INSTALL_PROJECT_DEPENDENCIES, {
                folderPath: project.folderPath,
                installCommand: installCommand,
            });

            toast({
                title: 'Dependencies reinstalled',
                description: 'Project dependencies have been reinstalled successfully',
            });
        } catch (error) {
            toast({
                title: 'Failed to reinstall dependencies',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsReinstalling(false);
            setShowReinstallDialog(false);
        }
    };

    const handleReinstallClick = () => {
        if (isTerminalRunning) {
            setShowReinstallDialog(true);
        } else {
            handleReinstallDependencies();
        }
    };

    return (
        <div className="text-sm">
            <div className="flex flex-col gap-4 p-4">
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
                            <Button size={'icon'} variant={'outline'} onClick={handleUpdatePath}>
                                <Icons.Directory />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4 p-4">
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

                <div className="pt-4 justify-end flex">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleReinstallClick}
                        disabled={isReinstalling}
                    >
                        {isReinstalling ? (
                            <Icons.Shadow className="h-4 w-4 animate-spin" />
                        ) : (
                            <Icons.MagicWand className="h-4 w-4" />
                        )}
                        {isReinstalling ? 'Reinstalling...' : 'Reinstall Dependencies'}
                    </Button>
                </div>
            </div>

            <AlertDialog open={showReinstallDialog} onOpenChange={setShowReinstallDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reinstall Dependencies</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your app is currently running. Reinstalling dependencies will stop the
                            running instance. Do you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="ghost" onClick={() => setShowReinstallDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => {
                                projectsManager.runner?.stop().then(() => {
                                    handleReinstallDependencies();
                                });
                            }}
                        >
                            Stop and Reinstall
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
});

export default ProjectTab;
