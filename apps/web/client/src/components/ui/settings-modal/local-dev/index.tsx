'use client';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { DEFAULT_LOCAL_CONFIG } from '@onlook/models';
import { runInAction } from 'mobx';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { toast } from 'sonner';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';

export const LocalDevTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { mutateAsync: updateBranch } = api.branch.update.useMutation();

    const activeBranch = editorEngine.branches.activeBranch;
    const currentConfig = activeBranch?.localConfig ?? DEFAULT_LOCAL_CONFIG;

    // Dev Server 状态（来自 SessionManager MobX observable）
    const devServerStatus = editorEngine.activeSandbox?.session?.devServerStatus ?? null;
    const devServerError = devServerStatus?.status === 'error' ? devServerStatus.error : null;

    // Form state
    const [formData, setFormData] = useState({
        devCommand: currentConfig.devCommand,
        buildCommand: currentConfig.buildCommand,
        port: currentConfig.port,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showRestart, setShowRestart] = useState(false);

    // Initialize form data when branch changes
    useEffect(() => {
        const config = activeBranch?.localConfig ?? DEFAULT_LOCAL_CONFIG;
        setFormData({
            devCommand: config.devCommand,
            buildCommand: config.buildCommand,
            port: config.port,
        });
    }, [activeBranch?.id, activeBranch?.localConfig]);

    // Check if form has changes
    const isDirty = useMemo(() => {
        return (
            formData.devCommand !== currentConfig.devCommand ||
            formData.buildCommand !== currentConfig.buildCommand ||
            formData.port !== currentConfig.port
        );
    }, [formData, currentConfig]);

    const handleSave = async () => {
        // Validate port number
        const portNum = Number(formData.port);
        if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
            toast.error('Port must be a number between 1024 and 65535');
            return;
        }

        // Validate commands
        if (!formData.devCommand.trim() || !formData.buildCommand.trim()) {
            toast.error('Commands cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            const newConfig = {
                devCommand: formData.devCommand.trim(),
                buildCommand: formData.buildCommand.trim(),
                port: portNum,
            };

            await updateBranch({
                id: activeBranch!.id,
                localConfig: newConfig,
            });

            // Update in-memory branch immediately for UI consistency
            runInAction(() => {
                if (activeBranch) {
                    activeBranch.localConfig = newConfig;
                }
            });

            // Sync new config to LocalProvider so restart uses updated values
            editorEngine.activeSandbox.session.updateLocalConfig(newConfig);

            toast.success('Local dev settings saved. Restart the dev server to apply changes.');
            setShowRestart(true);
        } catch (error) {
            console.error('Failed to update local dev settings:', error);
            toast.error('Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = () => {
        const config = activeBranch?.localConfig ?? DEFAULT_LOCAL_CONFIG;
        setFormData({
            devCommand: config.devCommand,
            buildCommand: config.buildCommand,
            port: config.port,
        });
        setShowRestart(false);
    };

    const handleRestart = async () => {
        try {
            const success = await editorEngine.activeSandbox.session.restartDevServer();
            if (success) {
                toast.success('Dev server restarted with new configuration.');
                setShowRestart(false);
            } else {
                toast.error('Failed to restart dev server.');
            }
        } catch (error) {
            console.error('Failed to restart dev server:', error);
            toast.error('Failed to restart dev server.');
        }
    };

    const updateField = (field: keyof typeof formData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="text-sm flex flex-col h-full">
            <div className="flex flex-col gap-4 p-6 pb-24 overflow-y-auto flex-1">
                <div className="flex flex-col gap-2">
                    <h2 className="text-lg">Local Dev Server Configuration</h2>
                    <p className="text-small text-foreground-secondary">
                        Configure how your local development server runs. Changes require a restart to take effect.
                    </p>
                </div>

                {/* Dev Server 错误横幅：端口冲突等启动失败时显示 */}
                {devServerError && (
                    <div className="flex flex-col gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                        <div className="flex items-start gap-2">
                            <Icons.CrossCircled className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs font-medium text-destructive">Dev Server Failed to Start</p>
                                <p className="text-xs text-muted-foreground mt-0.5 break-words">{devServerError}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pl-6">
                            <p className="text-xs text-muted-foreground">
                                Update the port or command below and restart.
                            </p>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleRestart}
                                className="h-7 px-3 shrink-0"
                            >
                                Restart
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="devCommand">Dev Command</Label>
                        <Input
                            id="devCommand"
                            value={formData.devCommand}
                            onChange={(e) => updateField('devCommand', e.target.value)}
                            placeholder="npm run dev"
                            disabled={isSaving}
                        />
                        <p className="text-xs text-muted-foreground">
                            The command to start your development server (e.g., <code>npm run dev</code>, <code>npx next dev</code>)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="buildCommand">Build Command</Label>
                        <Input
                            id="buildCommand"
                            value={formData.buildCommand}
                            onChange={(e) => updateField('buildCommand', e.target.value)}
                            placeholder="npm run build"
                            disabled={isSaving}
                        />
                        <p className="text-xs text-muted-foreground">
                            The command to build your project for production
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                            id="port"
                            type="number"
                            min={1024}
                            max={65535}
                            value={formData.port}
                            onChange={(e) => updateField('port', parseInt(e.target.value) || 3001)}
                            disabled={isSaving}
                        />
                        <p className="text-xs text-muted-foreground">
                            The port your dev server listens on (default: 3001)
                        </p>
                    </div>

                    {showRestart && (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                            <Icons.CheckCircled className="h-4 w-4 text-blue-500" />
                            <p className="text-xs flex-1">Settings saved. Restart the dev server to apply changes.</p>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleRestart}
                                className="h-7 px-3"
                            >
                                Restart Now
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Save/Discard buttons */}
            <div className="sticky bottom-0 bg-background border-t border-border/50 p-6" style={{ borderTopWidth: '0.5px' }}>
                <div className="flex justify-end gap-4">
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 px-4 py-2 bg-background border border-border/50"
                        type="button"
                        onClick={handleDiscard}
                        disabled={!isDirty || isSaving}
                    >
                        <span>Discard changes</span>
                    </Button>
                    <Button
                        variant="secondary"
                        className="flex items-center gap-2 px-4 py-2"
                        type="button"
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                    >
                        {isSaving && <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />}
                        <span>{isSaving ? 'Saving...' : 'Save changes'}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
});

