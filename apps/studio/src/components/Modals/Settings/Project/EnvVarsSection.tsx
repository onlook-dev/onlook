import { useProjectsManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { toast } from '@onlook/ui/use-toast';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

export const EnvVarsSection = observer(() => {
    const projectsManager = useProjectsManager();
    const project = projectsManager.project;
    const [newVarKey, setNewVarKey] = useState('');
    const [newVarValue, setNewVarValue] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const envVars = project?.env || {};

    const handleAddEnvVar = () => {
        if (!newVarKey) {
            toast({
                title: 'Error',
                description: 'Variable name cannot be empty',
                variant: 'destructive',
            });
            return;
        }

        if (envVars[newVarKey]) {
            toast({
                title: 'Error',
                description: `Variable "${newVarKey}" already exists`,
                variant: 'destructive',
            });
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

        toast({
            title: 'Environment variable added',
            description: `Added "${newVarKey}" to environment variables`,
        });
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

        toast({
            title: 'Environment variable updated',
            description: `Updated "${key}" environment variable`,
        });
    };

    const handleDeleteEnvVar = (key: string) => {
        const updatedEnvVars = { ...envVars };
        delete updatedEnvVars[key];

        projectsManager.updatePartialProject({
            env: updatedEnvVars,
        });

        toast({
            title: 'Environment variable removed',
            description: `Removed "${key}" from environment variables`,
        });
    };

    const startEditing = (key: string, value: string) => {
        setEditing(key);
        setEditValue(value);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <h2 className="text-lg">Environment Variables</h2>
                <p className="text-small text-foreground-secondary">
                    Environment variables to use when running your project
                </p>
            </div>

            <div className="space-y-4">
                {/* Current environment variables */}
                {Object.entries(envVars).length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                        <div className="bg-muted p-2 grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium">
                            <div>KEY</div>
                            <div>VALUE</div>
                            <div></div>
                        </div>
                        <div className="divide-y">
                            {Object.entries(envVars).map(([key, value]) => (
                                <div
                                    key={key}
                                    className="p-2 grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
                                >
                                    <div className="font-medium truncate">{key}</div>
                                    {editing === key ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                placeholder="Value"
                                                className="h-8"
                                            />
                                            <Button
                                                size="sm"
                                                variant="ghost"
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
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <div className="bg-muted px-2 py-1 rounded text-sm truncate">
                                                {value}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 justify-end">
                                        {editing !== key && (
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
                                                    className="h-8 w-8 text-destructive"
                                                >
                                                    <Icons.Trash className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">
                        No environment variables added yet.
                    </div>
                )}

                {/* Add new environment variable */}
                <div className="pt-2">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <Input
                            placeholder="KEY"
                            value={newVarKey}
                            onChange={(e) => setNewVarKey(e.target.value)}
                        />
                        <Input
                            placeholder="VALUE"
                            value={newVarValue}
                            onChange={(e) => setNewVarValue(e.target.value)}
                        />
                        <Button onClick={handleAddEnvVar} className="gap-1">
                            <Icons.Plus className="h-4 w-4" />
                            Add
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default EnvVarsSection;
