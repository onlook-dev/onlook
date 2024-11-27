import { useProjectsManager } from '@/components/Context';
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

const ProjectSettingsModal = observer(({ children }: { children: React.ReactNode }) => {
    const projectsManager = useProjectsManager();
    const [isOpen, setIsOpen] = useState(false);
    const [formValues, setFormValues] = useState({
        name: projectsManager.project?.name || '',
        url: projectsManager.project?.url || '',
        runCommand: projectsManager.project?.runCommand || 'npm run dev',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({
            ...formValues,
            [e.target.id]: e.target.value,
        });
    };

    const handleSave = () => {
        if (projectsManager.project) {
            projectsManager.updateProject({
                ...projectsManager.project,
                ...formValues,
            });
        }
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Project Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
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
                        <Label htmlFor="url" className="text-right">
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
                        <Label htmlFor="runCommand" className="text-right">
                            Command
                        </Label>
                        <Input
                            id="runCommand"
                            value={formValues.runCommand}
                            onChange={handleChange}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsOpen(false)} variant={'ghost'}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} variant={'outline'}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});

export default ProjectSettingsModal;
