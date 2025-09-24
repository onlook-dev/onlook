'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Play, Square } from 'lucide-react';

import type { Provider } from '@onlook/code-provider';
import type { FileEntry } from '@onlook/file-system/hooks';
import { CodeProvider, createCodeProviderClient } from '@onlook/code-provider';
import { useDirectory, useFile, useFS } from '@onlook/file-system/hooks';
import { Alert, AlertDescription } from '@onlook/ui/alert';
import { Badge } from '@onlook/ui/badge';

import type { FileNode } from './_components/file-explorer';
import { useSyncEngine } from '@/services/sync-engine/useSyncEngine';
import { api } from '@/trpc/react';
import { FileEditor } from './_components/file-editor';
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
                        userId: session.userId,
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

            // Load sandbox files
            await loadSandboxFiles(providerClient);
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
    };

    // Handle sandbox change
    const handleSandboxChange = (newSandboxId: string | null) => {
        if (newSandboxId !== sandboxId) {
            handleDisconnect();
            setSandboxId(newSandboxId);
            if (newSandboxId) {
                handleConnect(newSandboxId);
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
            console.error('Failed to load sandbox files:', error);
            // Try to list files in /home/projects if root fails
            try {
                const files = await buildFileTree(provider, '/home/projects');
                setSandboxFiles(files);
            } catch (fallbackError) {
                console.error('Failed to load files from fallback path:', fallbackError);
                setSandboxFiles([]);
            }
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
            {(connectionError || syncError || fsError || localDirError || localFileError) && (
                <Alert variant="destructive" className="m-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <div> Connection Error: {connectionError}</div>
                        <div>Sync Error: {syncError?.message}</div>
                        <div>FileSystem Error: {fsError?.message}</div>
                        <div>Local Directory Error: {localDirError?.message}</div>
                        <div>Local File Error: {localFileError?.message}</div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Side Panel */}
                <div className="w-80 overflow-hidden border-r border-gray-800">
                    <SandboxManager
                        sandboxId={sandboxId}
                        onSandboxChange={handleSandboxChange}
                        isConnected={!!provider}
                    />
                </div>

                {/* Sandbox Files */}
                <div className="flex flex-1 flex-col border-r border-gray-800">
                    <div className="h-2/5 overflow-hidden border-b border-gray-800">
                        <FileExplorer
                            files={sandboxFiles}
                            selectedPath={selectedSandboxFile}
                            onSelectFile={setSelectedSandboxFile}
                            onDeleteFile={handleDeleteSandboxFile}
                            title="Sandbox Files"
                            emptyMessage={
                                provider
                                    ? 'No files in sandbox'
                                    : 'Connect to a sandbox to view files'
                            }
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

                {/* Local Files */}
                <div className="flex flex-1 flex-col">
                    <div className="h-2/5 overflow-hidden border-b border-gray-800">
                        <FileExplorer
                            files={localFiles}
                            selectedPath={selectedLocalFile}
                            onSelectFile={setSelectedLocalFile}
                            onDeleteFile={handleDeleteLocalFile}
                            title="Local Files"
                            emptyMessage={
                                fsInitializing || localDirLoading
                                    ? 'Loading local files...'
                                    : 'No local files (will populate after sync)'
                            }
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
            </div>
        </div>
    );
}
