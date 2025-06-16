import { useProjectManager } from '@/components/store/project';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

export const EnvVars = observer(() => {
    const projectsManager = useProjectManager();
    const project = projectsManager.project;
    const [newVarKey, setNewVarKey] = useState('');
    const [newVarValue, setNewVarValue] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const envVars = project?.env || {};

    const handleAddEnvVar = () => {
        if (!newVarKey) {
            toast.error('Variable name cannot be empty');
            return;
        }

        if (envVars[newVarKey]) {
            toast.error(`Variable "${newVarKey}" already exists`);
            return;
        }

        projectsManager.updatePartialProject({
            env: {
                ...envVars,
                [newVarKey]: newVarValue,
            },
        });

        setNewVarKey('');
        setNewVarValue('');

        toast.success(`Added "${newVarKey}" to environment variables`);
    };

    const handleEditEnvVar = (key: string) => {
        projectsManager.updatePartialProject({
            env: {
                ...envVars,
                [key]: editValue,
            },
        });

        setEditing(null);
        setEditValue('');

        toast.success(`Updated "${key}" environment variable`);
    };

    const handleDeleteEnvVar = (key: string) => {
        const updatedEnvVars = { ...envVars };
        delete updatedEnvVars[key];

        projectsManager.updatePartialProject({
            env: updatedEnvVars,
        });

        toast.success(`Removed "${key}" from environment variables`);
    };

    const startEditing = (key: string, value: string) => {
        setEditing(key);
        setEditValue(value);
    };

    return (
        <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-2">
                <h2 className="text-lg">Environment Variables</h2>
                <p className="text-sm text-foreground-secondary">
                    Environment variables to use when running your project
                </p>
            </div>

            <div className="space-y-4">
                {Object.entries(envVars).length > 0 && (
                    <div className="border rounded p-2 grid grid-cols-10 gap-2 items-center">
                        <div className="col-span-4">KEY</div>
                        <div className="col-span-4">VALUE</div>
                        {Object.entries(envVars).map(([key, value]) => (
                            <>
                                <div className="truncate col-span-4">{key}</div>

                                <div className="flex items-center gap-2 col-span-6">
                                    <Input
                                        value={editing === key ? editValue : value}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        placeholder="Value"
                                        className={cn('h-8', {
                                            'border-none p-0 disabled:opacity-100': editing !== key,
                                        })}
                                        disabled={editing !== key}
                                    />

                                    {editing === key ? (
                                        <>
                                            <Button
                                                size="sm"
                                                onClick={() => handleEditEnvVar(key)}
                                                className="h-8"
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setEditing(null);
                                                    setEditValue('');
                                                }}
                                                className="h-8"
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => startEditing(key, value)}
                                                className="h-8 w-8"
                                            >
                                                <Icons.Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleDeleteEnvVar(key)}
                                                className="h-8 w-8 text-red-500"
                                            >
                                                <Icons.Trash className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </>
                        ))}
                    </div>
                )}

                {/* Add new environment variable */}
                <div className="pt-2">
                    <div className="grid grid-cols-10 gap-2">
                        <Input
                            placeholder="KEY"
                            value={newVarKey}
                            onChange={(e) => setNewVarKey(e.target.value)}
                            className="col-span-4"
                        />
                        <Input
                            placeholder="VALUE"
                            value={newVarValue}
                            onChange={(e) => setNewVarValue(e.target.value)}
                            className="col-span-5"
                        />
                        <Button onClick={handleAddEnvVar} className="col-span-1" variant="outline">
                            <Icons.Plus className="h-4 w-4" />
                            Add
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
});