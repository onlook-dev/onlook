'use client';

import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { DEFAULT_LOCAL_CONFIG, type LocalConfig } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface LocalProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export function LocalProjectModal({ isOpen, onClose, userId }: LocalProjectModalProps) {
    const { mutateAsync: createProject } = api.project.create.useMutation();

    const [formData, setFormData] = useState({
        projectName: 'my-nextjs-app',
        parentPath: '',
        devCommand: DEFAULT_LOCAL_CONFIG.devCommand,
        buildCommand: DEFAULT_LOCAL_CONFIG.buildCommand,
        port: DEFAULT_LOCAL_CONFIG.port,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [waitingForVSCode, setWaitingForVSCode] = useState(false);

    const updateField = (field: keyof typeof formData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.parentPath.trim()) {
            toast.error('Please enter a parent folder path');
            return;
        }

        if (!formData.projectName.trim()) {
            toast.error('Please enter a project name');
            return;
        }

        const portNum = Number(formData.port);
        if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
            toast.error('Port must be a number between 1024 and 65535');
            return;
        }

        if (!formData.devCommand.trim() || !formData.buildCommand.trim()) {
            toast.error('Commands cannot be empty');
            return;
        }

        setIsSubmitting(true);
        try {
            const localConfig: LocalConfig = {
                devCommand: formData.devCommand.trim(),
                buildCommand: formData.buildCommand.trim(),
                port: portNum,
            };

            // 1. Create the project record in the DB
            const newProject = await createProject({
                project: {
                    name: formData.projectName.trim(),
                    description: 'Local VSCode project',
                    tags: ['local'],
                },
                userId,
                environment: 'local_vscode' as const,
                localPath: formData.parentPath.trim(),
                localConfig,
            });

            if (!newProject) {
                toast.error('Failed to create project');
                return;
            }

            // 2. Generate a one-time token the extension will register
            const token = crypto.randomUUID();

            // 3. Build the onlookUrl — the extension will open this URL in the browser
            //    after creating the project, appending localAgent/token/workspacePath params
            const onlookUrl = `${window.location.origin}${Routes.PROJECT}/${newProject.id}`;

            // 4. Construct the vscode:// URI with all params
            const uriParams = new URLSearchParams({
                action: 'createProject',
                name: formData.projectName.trim(),
                parentPath: formData.parentPath.trim(),
                token,
                projectId: newProject.id,
                onlookUrl,
            });
            const ideUri = `vscode://onlook.onlook-local?${uriParams.toString()}`;

            // 5. Open the URI — triggers the Onlook VSCode/Cursor extension
            window.location.href = ideUri;

            // 6. Switch to waiting state
            setWaitingForVSCode(true);
            toast.info('Opening VSCode...', {
                description: 'The extension will create your project and open it here automatically.',
                duration: 10000,
            });
        } catch (error) {
            console.error('[LocalProjectModal] Error creating local project:', error);
            toast.error('Failed to create project', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setWaitingForVSCode(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                >
                    <motion.div
                        className="bg-background border border-border rounded-2xl max-w-lg w-full shadow-2xl"
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold">Create Local Project</h2>
                                    <p className="text-xs text-foreground-secondary mt-0.5">
                                        VSCode will scaffold a new Next.js project in the folder you specify.
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClose}
                                    className="p-2 rounded-full"
                                    disabled={isSubmitting}
                                >
                                    <Icons.CrossS className="w-4 h-4" />
                                </Button>
                            </div>

                            {waitingForVSCode ? (
                                <div className="flex flex-col items-center gap-4 py-8">
                                    <Icons.LoadingSpinner className="w-8 h-8 animate-spin text-foreground-secondary" />
                                    <p className="text-sm font-medium">Waiting for VSCode...</p>
                                    <p className="text-xs text-foreground-secondary text-center max-w-xs">
                                        The Onlook extension is creating your project. It will open automatically in your browser when ready.
                                    </p>
                                    <Button variant="outline" size="sm" onClick={handleClose} className="mt-2">
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="projectName">Project Name</Label>
                                        <Input
                                            id="projectName"
                                            value={formData.projectName}
                                            onChange={(e) => updateField('projectName', e.target.value)}
                                            placeholder="my-nextjs-app"
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="parentPath">Parent Folder Path</Label>
                                        <Input
                                            id="parentPath"
                                            value={formData.parentPath}
                                            onChange={(e) => updateField('parentPath', e.target.value)}
                                            placeholder="/Users/you/projects"
                                            disabled={isSubmitting}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            VSCode will create{' '}
                                            <code className="bg-muted px-1 rounded">
                                                {formData.parentPath.trim()
                                                    ? `${formData.parentPath.trim()}/${formData.projectName.trim() || 'project'}`
                                                    : `<path>/${formData.projectName.trim() || 'project'}`}
                                            </code>{' '}
                                            here.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="devCommand">Dev Command</Label>
                                            <Input
                                                id="devCommand"
                                                value={formData.devCommand}
                                                onChange={(e) => updateField('devCommand', e.target.value)}
                                                placeholder="npm run dev"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="buildCommand">Build Command</Label>
                                            <Input
                                                id="buildCommand"
                                                value={formData.buildCommand}
                                                onChange={(e) => updateField('buildCommand', e.target.value)}
                                                placeholder="npm run build"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="port">Dev Server Port</Label>
                                        <Input
                                            id="port"
                                            type="number"
                                            min={1024}
                                            max={65535}
                                            value={formData.port}
                                            onChange={(e) => updateField('port', parseInt(e.target.value) || 3001)}
                                            disabled={isSubmitting}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            The port your dev server will listen on (default: 3001).
                                        </p>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={handleClose}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="flex-1"
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <span className="flex items-center gap-2">
                                                    <Icons.LoadingSpinner className="w-4 h-4 animate-spin" />
                                                    Creating...
                                                </span>
                                            ) : (
                                                'Create & Open in VSCode'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
