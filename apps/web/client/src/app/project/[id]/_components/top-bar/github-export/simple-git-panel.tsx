
'use client';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Checkbox } from '@onlook/ui/checkbox';
import { observer } from 'mobx-react-lite';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import type { GitRepository, GitFileStatus, GitChangesManager } from '@/components/store/editor/git-changes';

interface GitPanelProps {
    connectedRepo: GitRepository | null;
    onClose: () => void;
    onChangeRepo?: () => void;
}

const StatusIcon = ({ status }: { status: GitFileStatus['status'] }) => {
    switch (status) {
        case 'added':
        case 'untracked':
            return <div className="w-3 h-3 rounded bg-green-600 flex items-center justify-center">
                <Icons.Plus className="w-2 h-2 text-white" />
            </div>;
        case 'modified':
            return <div className="w-3 h-3 rounded bg-yellow-600 flex items-center justify-center">
                <Icons.Edit className="w-2 h-2 text-white" />
            </div>;
        case 'deleted':
            return <div className="w-3 h-3 rounded bg-red-600 flex items-center justify-center">
                <Icons.Minus className="w-2 h-2 text-white" />
            </div>;
        case 'renamed':
            return <div className="w-3 h-3 rounded bg-blue-600 flex items-center justify-center">
                <Icons.ArrowRight className="w-2 h-2 text-white" />
            </div>;
        default:
            return <div className="w-3 h-3 rounded bg-gray-400" />;
    }
};

export const GitPanel = observer(({ connectedRepo, onClose, onChangeRepo }: GitPanelProps) => {
    const editorEngine = useEditorEngine();
    const [commitMessage, setCommitMessage] = useState('');
    const [isCommitting, setIsCommitting] = useState(false);
    const [hasAuthError, setHasAuthError] = useState(false);

    const pushMutation = api.github.pushChanges.useMutation();
    const activeBranch = editorEngine.branches.activeBranch;
    const gitManager = editorEngine.gitChanges;

    useEffect(() => {
        if (connectedRepo) {
            gitManager.setConnectedRepo(connectedRepo);
            setHasAuthError(false);
            
            if (!gitManager.isLoadingStatus) {
                gitManager.refreshStatus();
            }
        }
    }, [connectedRepo]);

    useEffect(() => {
        return () => {
            setHasAuthError(false);
        };
    }, []);

    const stagedFiles = useMemo(() => gitManager.stagedFiles ?? [], [gitManager.stagedFiles]);
    const unstagedFiles = useMemo(() => gitManager.unstagedFiles ?? [], [gitManager.unstagedFiles]);
    const allFiles = useMemo(() => gitManager.files ?? [], [gitManager.files]);

    const toggleStaging = async (filePath: string) => {
        const file = allFiles.find((f: GitFileStatus) => f.path === filePath);
        if (!file) return;
        
        if (file.staged) {
            await gitManager.unstageFile(filePath);
        } else {
            await gitManager.stageFile(filePath);
        }
    };

    const stageAll = async () => {
        await gitManager.stageAll();
    };

    const unstageAll = async () => {
        await gitManager.unstageAll();
    };

    const handleCommit = async () => {
        if (!commitMessage.trim()) {
            toast.error('Commit message is required');
            return;
        }

        if (!gitManager.hasStagedChanges) {
            toast.error('No files staged for commit');
            return;
        }

        if (!connectedRepo || !activeBranch) {
            toast.error('Repository or branch not available');
            return;
        }

        if (hasAuthError) {
            toast.error('GitHub Authentication Required', {
                description: 'Please re-authenticate with GitHub first.',
                action: {
                    label: 'Re-authenticate',
                    onClick: () => {
                        // Clear the auth error state and redirect to login
                        setHasAuthError(false);
                        window.location.href = '/login?provider=github';
                    },
                },
            });
            return;
        }

        setIsCommitting(true);

        try {
            // Get only the staged files for a proper git-like workflow
            const allPaths = editorEngine.activeSandbox.listAllFiles();
            const filesMap = await editorEngine.activeSandbox.readFiles(allPaths);
            
            const files = Object.entries(filesMap)
                .filter(([path]) => {
                    const isStaged = gitManager.stagedFiles.some((f: GitFileStatus) => f.path === path.replace(/^\.\//, ''));
                    return isStaged && 
                        !path.includes('node_modules') && 
                        !path.includes('.git') && 
                        !path.includes('dist/') && 
                        !path.includes('build/') &&
                        !path.startsWith('./.') &&
                        !path.endsWith('.log');
                })
                .map(([path, file]) => {
                    const cleanPath = path.replace(/^\.\//, '');
                    
                    if (file.type === 'text') {
                        return {
                            path: cleanPath,
                            content: file.content,
                            encoding: 'utf-8' as const,
                        };
                    } else if (file.content) {
                        const uint8Array = file.content as Uint8Array;
                        let binary = '';
                        const chunkSize = 0x8000;
                        for (let i = 0; i < uint8Array.length; i += chunkSize) {
                            const chunk = uint8Array.subarray(i, i + chunkSize);
                            binary += String.fromCharCode.apply(null, Array.from(chunk));
                        }
                        const base64 = btoa(binary);
                        
                        return {
                            path: cleanPath,
                            content: base64,
                            encoding: 'base64' as const,
                        };
                    }
                    return null;
                })
                .filter(Boolean) as Array<{path: string, content: string, encoding: 'utf-8' | 'base64'}>;

            if (files.length === 0) {
                const allFiles = Object.entries(filesMap)
                    .filter(([path]) => 
                        !path.includes('node_modules') && 
                        !path.includes('.git') && 
                        !path.includes('dist/') && 
                        !path.includes('build/') &&
                        !path.startsWith('./.') &&
                        !path.endsWith('.log')
                    )
                    .map(([path, file]) => {
                        const cleanPath = path.replace(/^\.\//, '');
                        
                        if (file.type === 'text') {
                            return {
                                path: cleanPath,
                                content: file.content,
                                encoding: 'utf-8' as const,
                            };
                        } else if (file.content) {
                            const uint8Array = file.content as Uint8Array;
                            let binary = '';
                            const chunkSize = 0x8000;
                            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                                const chunk = uint8Array.subarray(i, i + chunkSize);
                                binary += String.fromCharCode.apply(null, Array.from(chunk));
                            }
                            const base64 = btoa(binary);
                            
                            return {
                                path: cleanPath,
                                content: base64,
                                encoding: 'base64' as const,
                            };
                        }
                        return null;
                    })
                    .filter(Boolean) as Array<{path: string, content: string, encoding: 'utf-8' | 'base64'}>;
                
                files.push(...allFiles);
            }

            const result = await pushMutation.mutateAsync({
                owner: connectedRepo.owner,
                repo: connectedRepo.name,
                files,
                commitMessage: commitMessage.trim(),
                branchName: activeBranch.name,
            });

            if (result.success) {
                setHasAuthError(false);
                
                toast.success('Changes pushed successfully!', {
                    description: `Committed to ${connectedRepo.fullName}/${activeBranch.name}`,
                    action: {
                        label: 'View Commit',
                        onClick: () => window.open(result.commit.htmlUrl, '_blank'),
                    },
                });
                
                setCommitMessage('');
                await gitManager.refreshStatus();
                
                try {
                    await gitManager.commit({
                        message: commitMessage.trim(),
                    });
                } catch (error) {
                    console.warn('Local git commit failed but GitHub push succeeded:', error);
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to push changes';
            
            const isAuth = (error as any)?.data?.code === 'UNAUTHORIZED' || 
                          (error as any)?.status === 401 ||
                          message.toLowerCase().includes('token') || 
                          message.toLowerCase().includes('expired') || 
                          message.toLowerCase().includes('credentials') ||
                          message.toLowerCase().includes('bad credentials') ||
                          message.toLowerCase().includes('authentication') ||
                          message.toLowerCase().includes('unauthorized');
            
            if (isAuth) {
                setHasAuthError(true);
                toast.error('GitHub Authentication Required', {
                    description: 'Your GitHub session has expired. Please sign in again.',
                    action: {
                        label: 'Re-authenticate',
                        onClick: () => {
                            setHasAuthError(false);
                            window.location.href = '/login?provider=github';
                        },
                    },
                });
            } else {
                toast.error('Failed to push changes', {
                    description: message,
                });
            }
        } finally {
            setIsCommitting(false);
        }
    };

    if (!connectedRepo) {
        return (
            <div className="p-6 text-center">
                <Icons.GitHubLogo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Repository Connected</h3>
                <p className="text-sm text-muted-foreground">
                    Create a repository first to start tracking changes.
                </p>
            </div>
        );
    }

    return (
        <div className="p-0 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Changes</h3>
                    <p className="text-sm text-muted-foreground">
                        {connectedRepo.fullName} • {activeBranch?.name}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {onChangeRepo && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={onChangeRepo}
                            className="text-xs h-7"
                        >
                            Change Repo
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <Icons.Plus className="h-4 w-4 rotate-45" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {gitManager.isLoadingStatus ? (
                    <div className="p-8 text-center">
                        <Icons.LoadingSpinner className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Scanning for changes...</p>
                    </div>
                ) : !gitManager.hasChanges ? (
                    <div className="p-8 text-center">
                        <Icons.Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <h4 className="font-medium mb-1">No changes</h4>
                        <p className="text-sm text-muted-foreground">
                            Your working tree is clean
                        </p>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="mt-3"
                                            onClick={() => void gitManager.refreshStatus()}
                                        >
                                            <Icons.Rotate className="h-3 w-3 mr-1" />
                                            Refresh
                                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Changes List */}
                        <div className="flex-1 overflow-y-auto">
                            {/* Staged Changes */}
                            {stagedFiles.length > 0 && (
                                <div className="border-b">
                                    <div className="p-3 bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                                Staged changes ({stagedFiles.length})
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={unstageAll}
                                                className="h-6 px-2 text-xs"
                                            >
                                                Unstage all
                                            </Button>
                                        </div>
                                    </div>
                                    {stagedFiles.map((file: GitFileStatus) => (
                                        <div key={file.path} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                                            <Checkbox
                                                checked={true}
                                                onCheckedChange={() => void toggleStaging(file.path)}
                                            />
                                            <StatusIcon status={file.status} />
                                            <span className="flex-1 text-sm font-mono truncate" title={file.path}>
                                                {file.path}
                                            </span>
                                            <span className="text-xs text-muted-foreground uppercase">
                                                {file.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Unstaged Changes */}
                            {unstagedFiles.length > 0 && (
                                <div>
                                    <div className="p-3 bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                Changes ({unstagedFiles.length})
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={stageAll}
                                                className="h-6 px-2 text-xs"
                                            >
                                                Stage all
                                            </Button>
                                        </div>
                                    </div>
                                    {unstagedFiles.map((file: GitFileStatus) => (
                                        <div key={file.path} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                                            <Checkbox
                                                checked={false}
                                                onCheckedChange={() => void toggleStaging(file.path)}
                                            />
                                            <StatusIcon status={file.status} />
                                            <span className="flex-1 text-sm font-mono truncate" title={file.path}>
                                                {file.path}
                                            </span>
                                            <span className="text-xs text-muted-foreground uppercase">
                                                {file.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {gitManager.hasStagedChanges && (
                            <div className="border-t p-4 space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                        Ready to commit ({stagedFiles.length} {stagedFiles.length === 1 ? 'file' : 'files'})
                                    </span>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Icons.GitHubLogo className="h-3 w-3" />
                                        <span>→ {connectedRepo.fullName}</span>
                                    </div>
                                </div>
                                
                                <div>
                                    <Label htmlFor="commit-msg" className="text-sm font-medium">
                                        Commit message
                                    </Label>
                                    <Input
                                        id="commit-msg"
                                        placeholder="Update components"
                                        value={commitMessage}
                                        onChange={(e) => setCommitMessage(e.target.value)}
                                        disabled={isCommitting}
                                        className="mt-1"
                                        onKeyDown={(e) => {
                                            if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) && commitMessage.trim()) {
                                                void handleCommit();
                                            }
                                        }}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Press ⌘+Enter to commit and push
                                    </p>
                                </div>
                                
                                <Button
                                    onClick={handleCommit}
                                    disabled={!commitMessage.trim() || isCommitting || !gitManager.hasStagedChanges || hasAuthError}
                                    className="w-full"
                                    size="sm"
                                    variant={hasAuthError ? "destructive" : "default"}
                                >
                                    {isCommitting ? (
                                        <>
                                            <Icons.LoadingSpinner className="h-4 w-4 animate-spin mr-2" />
                                            Pushing changes...
                                        </>
                                    ) : hasAuthError ? (
                                        <>
                                            <Icons.Minus className="h-4 w-4 mr-2" />
                                            Authentication Required
                                        </>
                                    ) : (
                                        <>
                                            <Icons.GitHubLogo className="h-4 w-4 mr-2" />
                                            Commit & Push to {activeBranch?.name}
                                        </>
                                    )}
                                </Button>
                                
                                {hasAuthError && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">
                                        GitHub authentication expired. Please sign in again.
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});