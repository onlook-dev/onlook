import { useProjectsManager } from '@/components/Context';
import type { Project } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@onlook/ui/dialog';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

const DEFAULT_COMMANDS = {
    run: 'npm run dev',
    build: 'npm run build',
};

const ProjectSettingsModal = observer(
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
            commands: projectToUpdate?.commands || DEFAULT_COMMANDS,
        });

        const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

        // Use controlled props if provided, otherwise use internal state
        const isOpen = controlledOpen ?? uncontrolledOpen;
        const onOpenChange = controlledOnOpenChange ?? setUncontrolledOpen;

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { id, value } = e.target;
            setFormValues((prev) => {
                if (id === 'run' || id === 'build') {
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
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogTrigger asChild>{children}</DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Project Settings</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 text-small">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right text-foreground-secondary">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={formValues.name}
                                onChange={handleChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="url" className="text-right text-foreground-secondary">
                                Url
                            </Label>
                            <Input
                                id="url"
                                value={formValues.url}
                                onChange={handleChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label
                                htmlFor="folderPath"
                                className="text-right text-foreground-secondary"
                            >
                                Path
                            </Label>
                            <Input
                                id="folderPath"
                                value={formValues.folderPath}
                                onChange={handleChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="run" className="text-right text-foreground-secondary">
                                Run
                            </Label>
                            <Input
                                id="run"
                                value={formValues.commands.run || DEFAULT_COMMANDS.run}
                                onChange={handleChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="build" className="text-right text-foreground-secondary">
                                Build
                            </Label>
                            <Input
                                id="build"
                                value={formValues.commands.build || DEFAULT_COMMANDS.build}
                                onChange={handleChange}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => onOpenChange?.(false)} variant={'ghost'}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} variant={'outline'}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    },
);

export default ProjectSettingsModal;
