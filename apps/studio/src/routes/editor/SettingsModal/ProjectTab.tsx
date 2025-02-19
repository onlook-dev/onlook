import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

const ProjectTab = observer(
    ({
        children,
        project,
        open: controlledOpen,
        onOpenChange: controlledOnOpenChange,
    }: {
        children?: React.ReactNode;
        project?: Project | null;
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
    }) => {
        const projectsManager = useProjectsManager();
        const projectToUpdate = project || projectsManager.project;
        const [formValues, setFormValues] = useState({
            name: projectToUpdate?.name || '',
            url: projectToUpdate?.url || '',
            folderPath: projectToUpdate?.folderPath || '',
            commands: projectToUpdate?.commands || DefaultSettings.COMMANDS,
        });
        const [canSave, setCanSave] = useState(false);

        const handleUpdatePath = async () => {
            const path = (await invokeMainChannel(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
                | string
                | null;
            if (path) {
                setFormValues((prev) => ({ ...prev, folderPath: path }));
                setCanSave(true);
            }
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { id, value } = e.target;
            setFormValues((prev) => {
                if (id === 'run' || id === 'build' || id === 'install') {
                    return {
                        ...prev,
                        commands: {
                            ...prev.commands,
                            [id]: value,
                        },
                    };
                }
                return {
                    ...prev,
                    [id]: value,
                };
            });
            setCanSave(true);
        };

        const handleSave = () => {
            if (projectToUpdate) {
                projectsManager.updateProject({
                    ...projectToUpdate,
                    ...formValues,
                });
                setCanSave(false);
            }
        };

        return (
            <div className="space-y-8">
                <div className="space-y-4">
                    <h2 className="text-lg font-medium">Metadata</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-regularPlus text-muted-foreground">Name</p>
                            <Input
                                id="name"
                                value={formValues.name}
                                onChange={handleChange}
                                className="w-2/3"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-regularPlus text-muted-foreground">URL</p>
                            <Input
                                id="url"
                                value={formValues.url}
                                onChange={handleChange}
                                className="w-2/3"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-regularPlus text-muted-foreground">Path</p>
                            <div className="flex items-center gap-2 w-2/3">
                                <Input
                                    id="folderPath"
                                    value={formValues.folderPath}
                                    onChange={handleChange}
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

                {/* Add divider */}
                <div className="border-t border-border" />

                <div className="space-y-4">
                    <h2 className="text-lg font-medium">Commands</h2>
                    <p className="text-small text-foreground-secondary">
                        {" Only update these if you know what you're doing!"}
                    </p>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-regularPlus text-muted-foreground">Install</p>
                            <Input
                                id="install"
                                value={
                                    formValues.commands.install || DefaultSettings.COMMANDS.install
                                }
                                onChange={handleChange}
                                className="w-2/3"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-regularPlus text-muted-foreground">Run</p>
                            <Input
                                id="run"
                                value={formValues.commands.run || DefaultSettings.COMMANDS.run}
                                onChange={handleChange}
                                className="w-2/3"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-regularPlus text-muted-foreground">Build</p>
                            <Input
                                id="build"
                                value={formValues.commands.build || DefaultSettings.COMMANDS.build}
                                onChange={handleChange}
                                className="w-2/3"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button size={'sm'} onClick={handleSave} disabled={!canSave}>
                        {canSave ? 'Save' : 'Saved'}
                    </Button>
                </div>
            </div>
        );
    },
);

export default ProjectTab;
