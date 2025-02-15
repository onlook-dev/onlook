import { useProjectsManager } from '@/components/Context';
import { DefaultSettings } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
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
            <div>
                <div className="grid gap-4 py-4 text-small">
                    <div className="text-largePlus">Metadata</div>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="name" className={INPUT_CLASS}>
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={formValues.name}
                            onChange={handleChange}
                            className="col-span-3"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="url" className={INPUT_CLASS}>
                            Url
                        </Label>
                        <Input
                            id="url"
                            value={formValues.url}
                            onChange={handleChange}
                            className="col-span-3"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="folderPath" className={INPUT_CLASS}>
                            Path
                        </Label>
                        <Input
                            id="folderPath"
                            value={formValues.folderPath}
                            onChange={handleChange}
                            className="col-span-3"
                        />
                    </div>

                    <div className="text-largePlus">Commands</div>

                    <div className="flex items-center gap-4">
                        <Label htmlFor="install" className={INPUT_CLASS}>
                            Install
                        </Label>
                        <Input
                            id="install"
                            value={formValues.commands.install || DefaultSettings.COMMANDS.install}
                            onChange={handleChange}
                            className="col-span-3"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="run" className={INPUT_CLASS}>
                            Run
                        </Label>
                        <Input
                            id="run"
                            value={formValues.commands.run || DefaultSettings.COMMANDS.run}
                            onChange={handleChange}
                            className="col-span-3"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="build" className={INPUT_CLASS}>
                            Build
                        </Label>
                        <Input
                            id="build"
                            value={formValues.commands.build || DefaultSettings.COMMANDS.build}
                            onChange={handleChange}
                            className="col-span-3"
                        />
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
