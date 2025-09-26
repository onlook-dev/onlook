'use client';

import { AlertCircle, FileText, FolderPlus, Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Provider } from '@onlook/code-provider';
import { CodeProvider, createCodeProviderClient } from '@onlook/code-provider';
import type { FileEntry } from '@onlook/file-system/hooks';
import { useDirectory, useFile, useFS } from '@onlook/file-system/hooks';
import { Alert, AlertDescription } from '@onlook/ui/alert';
import { Badge } from '@onlook/ui/badge';

import { useSyncEngine } from '@/services/sync-engine/use-sync-engine';
import { api } from '@/trpc/react';
import { FileEditor } from './_components/file-editor';
import type { FileNode } from './_components/file-explorer';
import { FileExplorer } from './_components/file-explorer';
import { SandboxManager } from './_components/sandbox-manager';

// Test project configuration
const PROJECT_ID = 'test-sync-project';
const BRANCH_ID = 'main';
const STORAGE_KEY = 'onlook-test-sync-engine-sandbox';

export default function TestSyncEnginePage() {
    // Sandbox state
    const [sandboxId, setSandboxId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(STORAGE_KEY);
        }
        return null;
    });
    const [provider, setProvider] = useState<Provider | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // File system
    const rootDir = `/${PROJECT_ID}/${BRANCH_ID}`;
    const { fs, isInitializing: fsInitializing, error: fsError } = useFS(rootDir);

    // Use directory hook for local files
    const {
        entries: localEntries,
        loading: localDirLoading,
        error: localDirError,
    } = useDirectory(rootDir, '/');

    // Third independent file system instance (not part of sync engine)
    const { fs: independentFs, isInitializing: independentFsInitializing, error: independentFsError } = useFS(rootDir);
    const {
        entries: independentEntries,
        loading: independentDirLoading,
        error: independentDirError,
    } = useDirectory(rootDir, '/');

    // State for independent file browser
    const [selectedIndependentFile, setSelectedIndependentFile] = useState<string | null>(null);
    const {
        content: independentFileContent,
        loading: isLoadingIndependentContent,
        error: independentFileError,
    } = useFile(rootDir, selectedIndependentFile || '');

    // File browser state
    const [sandboxFiles, setSandboxFiles] = useState<FileNode[]>([]);
    const [selectedLocalFile, setSelectedLocalFile] = useState<string | null>(null);
    const [selectedSandboxFile, setSelectedSandboxFile] = useState<string | null>(null);
    const [sandboxFileContent, setSandboxFileContent] = useState<string | null>(null);
    const [isLoadingSandboxContent, setIsLoadingSandboxContent] = useState(false);

    // Use file hook for selected local file
    const {
        content: localFileContent,
        loading: isLoadingLocalContent,
        error: localFileError,
    } = useFile(rootDir, selectedLocalFile || '');

    // API mutations
    const startSandbox = api.sandbox.start.useMutation();

    // Sync engine
    const { error: syncError, isLoading: isSyncing } = useSyncEngine({
        provider,
        fs,
        config: {
            exclude: ['node_modules', '.git', '.next', 'dist', 'build', '.turbo'],
        },
    });

    // Update localStorage when sandboxId changes
    useEffect(() => {
        if (sandboxId) {
            localStorage.setItem(STORAGE_KEY, sandboxId);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [sandboxId]);

    // Auto-connect on mount if we have a sandboxId
    useEffect(() => {
        if (sandboxId && !provider && !isConnecting) {
            void handleConnect(sandboxId);
        }
    }, []); // Only on mount

    // Auto-refresh sandbox files every second when connected
    useEffect(() => {
        if (!provider) return;

        // Initial load
        void loadSandboxFiles(provider);

        // Set up interval for refreshing
        const interval = setInterval(() => {
            void loadSandboxFiles(provider);
            // Also refresh the selected file content if one is selected
            if (selectedSandboxFile) {
                void loadSandboxFileContent();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [provider, selectedSandboxFile]);

    // Connect to sandbox
    const handleConnect = async (id: string) => {
        setIsConnecting(true);
        setConnectionError(null);

        try {
            console.log('Connecting to sandbox:', id);

            const session = await startSandbox.mutateAsync({ sandboxId: id });

            // Create provider client
            const providerClient = await createCodeProviderClient(CodeProvider.CodeSandbox, {
                providerOptions: {
                    codesandbox: {
                        sandboxId: id,
                        userId: 'test',
                        initClient: true,
                        getSession: async (sandboxId) => {
                            // This will be called for reconnects
                            return await startSandbox.mutateAsync({ sandboxId });
                        },
                    },
                },
            });

            if (!providerClient) {
                throw new Error('Failed to create provider client');
            }

            console.log('Provider client:', providerClient);

            setProvider(providerClient);
            console.log('Connected successfully');
        } catch (error) {
            console.error('Failed to connect:', error);
            setConnectionError(error instanceof Error ? error.message : 'Failed to connect');
            setProvider(null);
        } finally {
            setIsConnecting(false);
        }
    };

    // Disconnect from sandbox
    const handleDisconnect = () => {
        setProvider(null);
        setSandboxFiles([]);
        setSelectedSandboxFile(null);
        setSandboxFileContent(null);
        setSelectedLocalFile(null);
    };

    // Handle sandbox change
    const handleSandboxChange = (newSandboxId: string | null) => {
        if (newSandboxId !== sandboxId) {
            handleDisconnect();
            setSandboxId(newSandboxId);
            if (newSandboxId) {
                void handleConnect(newSandboxId);
            }
        }
    };

    // Load sandbox files
    const loadSandboxFiles = async (provider: Provider) => {
        try {
            // First, try to list files in the root directory
            const result = await provider.listFiles({ args: { path: './' } });
            if (result.files && result.files.length > 0) {
                const files = await buildFileTree(provider, './');
                setSandboxFiles(files);
            } else {
                // If no files, set empty array
                setSandboxFiles([]);
            }
        } catch (error) {
            // Silently handle errors during refresh - files might be in transition
            setSandboxFiles([]);
        }
    };

    // Build file tree from sandbox
    const buildFileTree = async (provider: Provider, dir: string): Promise<FileNode[]> => {
        try {
            const result = await provider.listFiles({ args: { path: dir } });
            const nodes: FileNode[] = [];

            for (const entry of result.files) {
                // Build path - when dir is './', just use entry.name
                const path = dir === './' ? entry.name : `${dir}/${entry.name}`;

                // Skip excluded directories
                if (
                    entry.type === 'directory' &&
                    ['node_modules', '.git', '.next', 'dist', 'build', '.turbo'].includes(
                        entry.name,
                    )
                ) {
                    continue;
                }

                const node: FileNode = {
                    name: entry.name,
                    path,
                    type: entry.type,
                };

                if (entry.type === 'directory') {
                    node.children = await buildFileTree(provider, path);
                }

                nodes.push(node);
            }

            return nodes.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        } catch (error) {
            console.error(`Failed to read directory ${dir}:`, error);
            return [];
        }
    };

    // Convert FileEntry[] to FileNode[] format for local files
    const convertToFileNodes = (entries: FileEntry[]): FileNode[] => {
        return entries.map((entry) => ({
            name: entry.name,
            path: entry.path,
            type: entry.isDirectory ? 'directory' : 'file',
            children: entry.children ? convertToFileNodes(entry.children) : undefined,
        }));
    };

    // Get local files from useDirectory hook
    const localFiles = convertToFileNodes(localEntries ?? []);
    const independentFiles = convertToFileNodes(independentEntries ?? []);

    // Create file handler
    const handleCreateFile = async (path: string, content?: string) => {
        if (!fs) return;
        try {
            await fs.createFile(path, content || '// New file\n');
            console.log(`Created file: ${path}`);
        } catch (error) {
            console.error('Failed to create file:', error);
            alert(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Create directory handler
    const handleCreateDirectory = async (path: string) => {
        if (!fs) return;
        try {
            await fs.createDirectory(path);
            console.log(`Created directory: ${path}`);
        } catch (error) {
            console.error('Failed to create directory:', error);
            alert(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Independent file system handlers
    const handleCreateIndependentFile = async (path: string, content?: string) => {
        if (!independentFs) return;
        try {
            await independentFs.createFile(path, content || '// New file\n');
            console.log(`Created independent file: ${path}`);
        } catch (error) {
            console.error('Failed to create independent file:', error);
            alert(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleCreateIndependentDirectory = async (path: string) => {
        if (!independentFs) return;
        try {
            await independentFs.createDirectory(path);
            console.log(`Created independent directory: ${path}`);
        } catch (error) {
            console.error('Failed to create independent directory:', error);
            alert(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Load file content from sandbox
    const loadSandboxFileContent = async () => {
        if (!provider || !selectedSandboxFile) return;

        setIsLoadingSandboxContent(true);
        try {
            const result = await provider.readFile({ args: { path: selectedSandboxFile } });
            const { file } = result;

            if (file.type === 'text') {
                setSandboxFileContent(file.content);
            } else {
                // Binary file
                setSandboxFileContent(null);
            }
        } catch (error) {
            console.error('Failed to load sandbox file:', error);
            setSandboxFileContent(null);
        } finally {
            setIsLoadingSandboxContent(false);
        }
    };

    // Load content when file selection changes
    useEffect(() => {
        if (selectedSandboxFile) {
            loadSandboxFileContent();
        } else {
            setSandboxFileContent(null);
        }
    }, [selectedSandboxFile, provider]);

    const isBinaryFile = (content: string | Uint8Array | null) => {
        return content === null || content instanceof Uint8Array;
    };

    // Save local file
    const handleSaveLocalFile = async (content: string) => {
        if (!fs || !selectedLocalFile) return;

        try {
            await fs.writeFile(selectedLocalFile, content);
            // The useFile hook will automatically reload the content
        } catch (error) {
            console.error('Failed to save file:', error);
            throw error;
        }
    };

    // Save sandbox file
    const handleSaveSandboxFile = async (content: string) => {
        if (!provider || !selectedSandboxFile) return;

        try {
            await provider.writeFile({
                args: {
                    path: selectedSandboxFile,
                    content,
                    overwrite: true,
                },
            });
            // Reload the content to confirm save
            await loadSandboxFileContent();
        } catch (error) {
            console.error('Failed to save sandbox file:', error);
            throw error;
        }
    };

    // Create sandbox file
    const handleCreateSandboxFile = async (path: string, content?: string) => {
        if (!provider) return;
        try {
            await provider.writeFile({
                args: {
                    path,
                    content: content || '// New file\n',
                    overwrite: false,
                },
            });
            console.log(`Created sandbox file: ${path}`);
            // Reload sandbox files
            await loadSandboxFiles(provider);
        } catch (error) {
            console.error('Failed to create sandbox file:', error);
            alert(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Create sandbox directory
    const handleCreateSandboxDirectory = async (path: string) => {
        if (!provider) return;
        try {
            // Create a temporary file in the directory to force directory creation
            const tempFilePath = `${path}/.gitkeep`;
            await provider.writeFile({
                args: {
                    path: tempFilePath,
                    content: '',
                    overwrite: false,
                },
            });
            console.log(`Created sandbox directory: ${path}`);
            // Reload sandbox files
            await loadSandboxFiles(provider);
        } catch (error) {
            console.error('Failed to create sandbox directory:', error);
            alert(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Delete sandbox file or directory
    const handleDeleteSandboxFile = async (path: string) => {
        if (!provider) return;

        try {
            // Check if it's a directory by trying to list files
            let isDirectory = false;
            try {
                await provider.listFiles({ args: { path } });
                isDirectory = true;
            } catch {
                // Not a directory, it's a file
            }

            await provider.deleteFiles({
                args: {
                    path,
                    recursive: isDirectory,
                },
            });

            // Clear selection if deleted file was selected
            if (selectedSandboxFile === path) {
                setSelectedSandboxFile(null);
                setSandboxFileContent(null);
            }

            // Reload sandbox files
            await loadSandboxFiles(provider);
        } catch (error) {
            console.error('Failed to delete sandbox file/directory:', error);
            alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Delete local file or directory
    const handleDeleteLocalFile = async (path: string) => {
        if (!fs) return;

        try {
            // Check if it's a directory
            const info = await fs.getInfo(path);

            if (info.isDirectory) {
                await fs.deleteDirectory(path);
            } else {
                await fs.deleteFile(path);
            }

            // Clear selection if deleted file was selected
            if (selectedLocalFile === path) {
                setSelectedLocalFile(null);
            }
        } catch (error) {
            console.error('Failed to delete local file/directory:', error);
            alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Rename sandbox file or directory
    const handleRenameSandboxFile = async (oldPath: string, newName: string) => {
        if (!provider) return;

        try {
            // Calculate new path
            const lastSlash = oldPath.lastIndexOf('/');
            const newPath =
                lastSlash === -1 ? newName : `${oldPath.substring(0, lastSlash)}/${newName}`;

            await provider.renameFile({
                args: {
                    oldPath,
                    newPath,
                },
            });

            // Update selection if renamed file was selected
            if (selectedSandboxFile === oldPath) {
                setSelectedSandboxFile(newPath);
            }

            // Reload sandbox files
            await loadSandboxFiles(provider);
        } catch (error) {
            console.error('Failed to rename sandbox file/directory:', error);
            alert(`Failed to rename: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Rename local file or directory
    const handleRenameLocalFile = async (oldPath: string, newName: string) => {
        if (!fs) return;

        try {
            // Calculate new path
            const lastSlash = oldPath.lastIndexOf('/');
            const newPath =
                lastSlash === -1 ? `/${newName}` : `${oldPath.substring(0, lastSlash)}/${newName}`;

            await fs.moveFile(oldPath, newPath);

            // Update selection if renamed file was selected
            if (selectedLocalFile === oldPath) {
                setSelectedLocalFile(newPath);
            }
        } catch (error) {
            console.error('Failed to rename local file/directory:', error);
            alert(`Failed to rename: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Save independent file
    const handleSaveIndependentFile = async (content: string) => {
        if (!independentFs || !selectedIndependentFile) return;

        try {
            await independentFs.writeFile(selectedIndependentFile, content);
        } catch (error) {
            console.error('Failed to save file:', error);
            throw error;
        }
    };

    // Delete independent file or directory
    const handleDeleteIndependentFile = async (path: string) => {
        if (!independentFs) return;

        try {
            const info = await independentFs.getInfo(path);

            if (info.isDirectory) {
                await independentFs.deleteDirectory(path);
            } else {
                await independentFs.deleteFile(path);
            }

            if (selectedIndependentFile === path) {
                setSelectedIndependentFile(null);
            }
        } catch (error) {
            console.error('Failed to delete independent file/directory:', error);
            alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Rename independent file or directory
    const handleRenameIndependentFile = async (oldPath: string, newName: string) => {
        if (!independentFs) return;

        try {
            const lastSlash = oldPath.lastIndexOf('/');
            const newPath =
                lastSlash === -1 ? `/${newName}` : `${oldPath.substring(0, lastSlash)}/${newName}`;

            await independentFs.moveFile(oldPath, newPath);

            if (selectedIndependentFile === oldPath) {
                setSelectedIndependentFile(newPath);
            }
        } catch (error) {
            console.error('Failed to rename independent file/directory:', error);
            alert(`Failed to rename: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="flex h-screen flex-col bg-gray-950">
            {/* Header */}
            <div className="border-b border-gray-800 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-100">Sync Engine Test</h1>
                        <p className="mt-1 text-sm text-gray-400">
                            Test file syncing between CodeSandbox and local file system
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {syncError && (
                            <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Sync Error
                            </Badge>
                        )}
                        {isSyncing && (
                            <Badge variant="default" className="gap-1">
                                <Square className="h-3 w-3 animate-pulse" />
                                Syncing...
                            </Badge>
                        )}
                        {provider && !isSyncing && !syncError && (
                            <Badge variant="secondary" className="gap-1">
                                <Play className="h-3 w-3" />
                                Sync Active
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Error messages */}
            {(connectionError || syncError || fsError || localDirError || localFileError || independentFsError || independentDirError || independentFileError) && (
                <Alert variant="destructive" className="m-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {connectionError && <div>Connection Error: {connectionError}</div>}
                        {syncError && <div>Sync Error: {syncError.message}</div>}
                        {fsError && <div>FileSystem Error: {fsError.message}</div>}
                        {localDirError && <div>Local Directory Error: {localDirError.message}</div>}
                        {localFileError && <div>Local File Error: {localFileError.message}</div>}
                        {independentFsError && <div>Independent FS Error: {independentFsError.message}</div>}
                        {independentDirError && <div>Independent Dir Error: {independentDirError.message}</div>}
                        {independentFileError && <div>Independent File Error: {independentFileError.message}</div>}
                    </AlertDescription>
                </Alert>
            )}

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Side Panel */}
                <div className="w-64 overflow-hidden border-r border-gray-800">
                    <SandboxManager
                        sandboxId={sandboxId}
                        onSandboxChange={handleSandboxChange}
                        isConnected={!!provider}
                    />
                </div>

                {/* File browsers container */}
                <div className="flex flex-1">
                    {/* Sandbox Files */}
                    <div className="flex flex-1 flex-col border-r border-gray-800">
                        <div className="h-2/5 overflow-hidden border-b border-gray-800">
                            <FileExplorer
                                files={sandboxFiles}
                                selectedPath={selectedSandboxFile}
                                onSelectFile={setSelectedSandboxFile}
                                onDeleteFile={handleDeleteSandboxFile}
                                onRenameFile={handleRenameSandboxFile}
                                title="Sandbox Files"
                                emptyMessage={
                                    provider
                                        ? 'No files in sandbox'
                                        : 'Connect to a sandbox to view files'
                                }
                                contextMenuItems={provider ? [
                                    {
                                        label: 'Create File',
                                        icon: FileText,
                                        onClick: handleCreateSandboxFile,
                                    },
                                    {
                                        label: 'Create Directory',
                                        icon: FolderPlus,
                                        onClick: handleCreateSandboxDirectory,
                                    },
                                ] : []}
                            />
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <FileEditor
                                fileName={selectedSandboxFile}
                                content={sandboxFileContent}
                                isLoading={isLoadingSandboxContent}
                                isBinary={isBinaryFile(sandboxFileContent)}
                                onSave={handleSaveSandboxFile}
                            />
                        </div>
                    </div>

                    {/* Local Files (Sync Engine) */}
                    <div className="flex flex-1 flex-col border-r border-gray-800">
                        <div className="h-2/5 overflow-hidden border-b border-gray-800">
                            <FileExplorer
                                files={localFiles}
                                selectedPath={selectedLocalFile}
                                onSelectFile={setSelectedLocalFile}
                                onDeleteFile={handleDeleteLocalFile}
                                onRenameFile={handleRenameLocalFile}
                                title="Local Files (Sync Engine)"
                                emptyMessage={
                                    fsInitializing || localDirLoading
                                        ? 'Loading local files...'
                                        : 'No local files (will populate after sync)'
                                }
                                contextMenuItems={[
                                    {
                                        label: 'Create File',
                                        icon: FileText,
                                        onClick: handleCreateFile,
                                    },
                                    {
                                        label: 'Create Directory',
                                        icon: FolderPlus,
                                        onClick: handleCreateDirectory,
                                    },
                                ]}
                            />
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <FileEditor
                                fileName={selectedLocalFile}
                                content={typeof localFileContent === 'string' ? localFileContent : null}
                                isLoading={isLoadingLocalContent}
                                isBinary={isBinaryFile(localFileContent)}
                                onSave={handleSaveLocalFile}
                            />
                        </div>
                    </div>

                    {/* Independent Local Files */}
                    <div className="flex flex-1 flex-col">
                        <div className="h-2/5 overflow-hidden border-b border-gray-800">
                            <FileExplorer
                                files={independentFiles}
                                selectedPath={selectedIndependentFile}
                                onSelectFile={setSelectedIndependentFile}
                                onDeleteFile={handleDeleteIndependentFile}
                                onRenameFile={handleRenameIndependentFile}
                                title="Independent Local FS"
                                emptyMessage={
                                    independentFsInitializing || independentDirLoading
                                        ? 'Loading independent files...'
                                        : 'No files in independent FS'
                                }
                                contextMenuItems={[
                                    {
                                        label: 'Create File',
                                        icon: FileText,
                                        onClick: handleCreateIndependentFile,
                                    },
                                    {
                                        label: 'Create Directory',
                                        icon: FolderPlus,
                                        onClick: handleCreateIndependentDirectory,
                                    },
                                ]}
                            />
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <FileEditor
                                fileName={selectedIndependentFile}
                                content={typeof independentFileContent === 'string' ? independentFileContent : null}
                                isLoading={isLoadingIndependentContent}
                                isBinary={isBinaryFile(independentFileContent)}
                                onSave={handleSaveIndependentFile}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
