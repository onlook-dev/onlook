import { useProjectsManager } from '@/components/Context';
import { DefaultSettings } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { Input } from '@onlook/ui/input';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';

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
        const INPUT_CLASS = 'w-20 text-foreground-secondary';
        const projectsManager = useProjectsManager();
        const projectToUpdate = project || projectsManager.project;
        const [formValues, setFormValues] = useState({
            name: projectToUpdate?.name || '',
            url: projectToUpdate?.url || '',
            folderPath: projectToUpdate?.folderPath || '',
            commands: projectToUpdate?.commands || DefaultSettings.COMMANDS,
        });

        const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
        const [isCommandsOpen, setIsCommandsOpen] = useState(false);

        // Use controlled props if provided, otherwise use internal state
        const isOpen = controlledOpen ?? uncontrolledOpen;
        const triggerRef = useRef<HTMLDivElement>(null);
        const onOpenChange = (open: boolean) => {
            if (!open) {
                // Reset collapsible state when dialog closes
                setIsCommandsOpen(false);
                // Return focus to trigger
                triggerRef.current?.focus();
            }
            (controlledOnOpenChange ?? setUncontrolledOpen)(open);
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
        };

        const handleSave = () => {
            if (projectToUpdate) {
                projectsManager.updateProject({
                    ...projectToUpdate,
                    ...formValues,
                });
            }
            onOpenChange(false);
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
                            <Input
                                id="folderPath"
                                value={formValues.folderPath}
                                onChange={handleChange}
                                className="w-2/3"
                            />
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
                    <Button size={'sm'} onClick={handleSave}>
                        Save
                    </Button>
                </div>
            </div>
        );
    },
);

export default ProjectTab;
