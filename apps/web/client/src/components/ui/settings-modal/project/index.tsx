
import { useEditorEngine } from '@/components/store/editor';
import { useDebouncedInput } from '@/hooks/use-debounce-input';
import { api } from '@/trpc/react';
import { DefaultSettings } from '@onlook/constants';
import { fromProjectSettings } from '@onlook/db';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';

export const ProjectTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { data: project } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    const { mutateAsync: updateProject } = api.project.update.useMutation();
    const { data: projectSettings } = api.settings.get.useQuery({ projectId: editorEngine.projectId });
    const { mutateAsync: updateProjectSettings } = api.settings.upsert.useMutation();

    const installCommand = projectSettings?.commands?.install ?? DefaultSettings.COMMANDS.install;
    const runCommand = projectSettings?.commands?.run ?? DefaultSettings.COMMANDS.run;
    const buildCommand = projectSettings?.commands?.build ?? DefaultSettings.COMMANDS.build;
    const name = project?.name ?? '';

    // Create debounced input handlers
    const nameInput = useDebouncedInput(
        name,
        (value) => updateProject({
            id: editorEngine.projectId,
            project: {
                name: value,
            },
        })
    );

    const installInput = useDebouncedInput(
        installCommand,
        (value) => updateProjectSettings({
            projectId: editorEngine.projectId,
            settings: fromProjectSettings(editorEngine.projectId, {
                commands: {
                    ...projectSettings?.commands,
                    install: value,
                },
            }),
        })
    );

    const runInput = useDebouncedInput(
        runCommand,
        (value) => updateProjectSettings({
            projectId: editorEngine.projectId,
            settings: fromProjectSettings(editorEngine.projectId, {
                commands: {
                    ...projectSettings?.commands,
                    run: value,
                },
            }),
        })
    );

    const buildInput = useDebouncedInput(
        buildCommand,
        (value) => updateProjectSettings({
            projectId: editorEngine.projectId,
            settings: fromProjectSettings(editorEngine.projectId, {
                commands: {
                    ...projectSettings?.commands,
                    build: value,
                },
            }),
        })
    );

    return (
        <div className="text-sm">
            <div className="flex flex-col gap-4 p-6">
                <h2 className="text-lg">Metadata</h2>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-muted-foreground">Name</p>
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
                        <p className="text-muted-foreground">Run</p>
                        <Input
                            id="run"
                            value={runInput.localValue}
                            className="w-2/3"
                            onChange={runInput.handleChange}
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-muted-foreground">Build</p>
                        <Input
                            id="build"
                            value={buildInput.localValue}
                            onChange={buildInput.handleChange}
                            className="w-2/3"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});