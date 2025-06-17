import { useProjectManager } from '@/components/store/project';
import { DefaultSettings } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import { ReinstallButton } from './reinstall-button';
import { useDebouncedInput } from '@/hooks/use-debounce-input';

export const ProjectTab = observer(() => {
    const projectsManager = useProjectManager();
    const project = projectsManager.project;
    const projectSettings = projectsManager.projectSettings;

    const installCommand = projectSettings?.commands?.install ?? DefaultSettings.COMMANDS.install;
    const runCommand = projectSettings?.commands?.run ?? DefaultSettings.COMMANDS.run;
    const buildCommand = projectSettings?.commands?.build ?? DefaultSettings.COMMANDS.build;
    const name = project?.name ?? '';
    const url = project?.sandbox.url ?? '';

    // Create debounced input handlers
    const nameInput = useDebouncedInput(
        name,
        (value) => projectsManager.updatePartialProject({ name: value })
    );

    const installInput = useDebouncedInput(
        installCommand,
        (value) => projectsManager.updateProjectSettings({
            commands: {
                ...projectSettings?.commands,
                install: value,
            },
        })
    );

    const runInput = useDebouncedInput(
        runCommand,
        (value) => projectsManager.updateProjectSettings({
            commands: {
                ...projectSettings?.commands,
                run: value,
            },
        })
    );

    const buildInput = useDebouncedInput(
        buildCommand,
        (value) => projectsManager.updateProjectSettings({
            commands: {
                ...projectSettings?.commands,
                build: value,
            },
        })
    );

    return (
        <div className="text-sm">
            <div className="flex flex-col gap-4 p-6">
                <h2 className="text-lg">Metadata</h2>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className=" text-muted-foreground">Name</p>
                        <Input
                            id="name"
                            value={nameInput.localValue}
                            onChange={nameInput.handleChange}
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
                            value={installInput.localValue}
                            className="w-2/3"
                            onChange={installInput.handleChange}
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <p className=" text-muted-foreground">Run</p>
                        <Input
                            id="run"
                            value={runInput.localValue}
                            className="w-2/3"
                            onChange={runInput.handleChange}
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <p className=" text-muted-foreground">Build</p>
                        <Input
                            id="build"
                            value={buildInput.localValue}
                            onChange={buildInput.handleChange}
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