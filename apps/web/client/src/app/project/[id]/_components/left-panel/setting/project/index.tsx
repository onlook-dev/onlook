import { useProjectManager } from '@/components/store/project';
import { DefaultSettings } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { ReinstallButton } from './reinstall-button';


export const ProjectTab = observer(() => {
    const projectsManager = useProjectManager();
    const project = projectsManager.project;
    const projectSettings = projectsManager.projectSettings;

    const installCommand = projectSettings?.commands?.install ?? DefaultSettings.COMMANDS.install;
    const runCommand = projectSettings?.commands?.run ?? DefaultSettings.COMMANDS.run;
    const buildCommand = projectSettings?.commands?.build ?? DefaultSettings.COMMANDS.build;
    const name = project?.name ?? '';
    const url = project?.sandbox.url ?? '';


    return (
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
                                projectsManager.updateProjectSettings({
                                    commands: {
                                        ...projectSettings?.commands,
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
                                projectsManager.updateProjectSettings({
                                    commands: {
                                        ...projectSettings?.commands,
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
                                projectsManager.updateProjectSettings({
                                    commands: {
                                        ...projectSettings?.commands,
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
    );
});