import { useProjectsManager } from '@/components/Context';
import { DefaultSettings } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { DialogFooter, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';

const ProjectSettingsModal = observer(({ project }: { project?: Project | null }) => {
    const projectsManager = useProjectsManager();
    const projectToUpdate = project || projectsManager.project;
    const [formValues, setFormValues] = useState({
        name: projectToUpdate?.name || '',
        url: projectToUpdate?.url || '',
        folderPath: projectToUpdate?.folderPath || '',
        commands: projectToUpdate?.commands || DefaultSettings.COMMANDS,
    });
    const [isCommandsOpen, setIsCommandsOpen] = useState(false);

    // Reset form values when project changes
    useEffect(() => {
        if (projectToUpdate) {
            setFormValues({
                name: projectToUpdate.name || '',
                url: projectToUpdate.url || '',
                folderPath: projectToUpdate.folderPath || '',
                commands: projectToUpdate.commands || DefaultSettings.COMMANDS,
            });
        }
    }, [projectToUpdate]);

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

    const handleClose = () => {
        projectsManager.isSettingsOpen = false;
    };

    const handleSave = () => {
        if (projectToUpdate) {
            projectsManager.updateProject({
                ...projectToUpdate,
                ...formValues,
            });
            handleClose();
        }
    };

    return (
        <>
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
                    <Label htmlFor="folderPath" className="text-right text-foreground-secondary">
                        Path
                    </Label>
                    <Input
                        id="folderPath"
                        value={formValues.folderPath}
                        onChange={handleChange}
                        className="col-span-3"
                    />
                </div>

                <Collapsible open={isCommandsOpen} onOpenChange={setIsCommandsOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm">
                        <Icons.ChevronDown
                            className={cn(
                                'h-4 w-4 transition-transform duration-200',
                                isCommandsOpen ? '' : '-rotate-90',
                            )}
                        />
                        Commands
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                        <div className="space-y-3">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label
                                    htmlFor="install"
                                    className="text-right text-foreground-secondary"
                                >
                                    Install
                                </Label>
                                <Input
                                    id="install"
                                    value={
                                        formValues.commands.install ||
                                        DefaultSettings.COMMANDS.install
                                    }
                                    onChange={handleChange}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label
                                    htmlFor="run"
                                    className="text-right text-foreground-secondary"
                                >
                                    Run
                                </Label>
                                <Input
                                    id="run"
                                    value={formValues.commands.run || DefaultSettings.COMMANDS.run}
                                    onChange={handleChange}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label
                                    htmlFor="build"
                                    className="text-right text-foreground-secondary"
                                >
                                    Build
                                </Label>
                                <Input
                                    id="build"
                                    value={
                                        formValues.commands.build || DefaultSettings.COMMANDS.build
                                    }
                                    onChange={handleChange}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
            <DialogFooter>
                <Button onClick={handleClose} variant={'ghost'}>
                    Cancel
                </Button>
                <Button onClick={handleSave} variant={'outline'}>
                    Save
                </Button>
            </DialogFooter>
        </>
    );
});

export default ProjectSettingsModal;
