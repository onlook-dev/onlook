'use client';

import { AlertCircle, Copy, Edit2, Move, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import path from 'path';

import { useDirectory, useFile, useFS, type FileEntry } from '@onlook/file-system/hooks';
import { Alert, AlertDescription } from '@onlook/ui/alert';
import { Button } from '@onlook/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@onlook/ui/dialog';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Textarea } from '@onlook/ui/textarea';

import { FileExplorer, type FileNode } from '../test-sync-engine/_components/file-explorer';

// Use the same project configuration as test-sync-engine
const PROJECT_ID = 'test-sync-project';
const BRANCH_ID = 'main';

export default function TestLocalFSPage() {
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
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createType, setCreateType] = useState<'file' | 'directory'>('file');
    const [createPath, setCreatePath] = useState('');
    const [createContent, setCreateContent] = useState('');

    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [moveSource, setMoveSource] = useState('');
    const [moveDestination, setMoveDestination] = useState('');

    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [copySource, setCopySource] = useState('');
    const [copyDestination, setCopyDestination] = useState('');

    // Use file hook for selected file
    const {
        content: loadedContent,
        loading: isLoadingContent,
        error: fileError,
    } = useFile(rootDir, selectedFile || '');

    // Update content when file loads
    useEffect(() => {
        if (typeof loadedContent === 'string') {
            setFileContent(loadedContent);
        } else if (loadedContent) {
            setFileContent('[Binary file - cannot display]');
        } else {
            setFileContent('');
        }
        setIsEditing(false);
    }, [loadedContent]);

    // Convert FileEntry[] to FileNode[] format
    const convertToFileNodes = (entries: FileEntry[]): FileNode[] => {
        return entries.map((entry) => ({
            name: entry.name,
            path: entry.path,
            type: entry.isDirectory ? 'directory' : 'file',
            children: entry.children ? convertToFileNodes(entry.children) : undefined,
        }));
    };

    const localFiles = convertToFileNodes(localEntries ?? []);

    // File operations
    const handleCreateFile = async () => {
        if (!fs || !createPath) return;

        try {
            if (createType === 'file') {
                await fs.createFile(createPath, createContent);
            } else {
                await fs.createDirectory(createPath);
            }
            setCreateDialogOpen(false);
            setCreatePath('');
            setCreateContent('');
        } catch (error) {
            console.error('Failed to create:', error);
            alert(`Failed to create: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleDeleteFile = async (path: string) => {
        if (!fs) return;

        try {
            const info = await fs.getInfo(path);
            if (info.isDirectory) {
                await fs.deleteDirectory(path);
            } else {
                await fs.deleteFile(path);
            }

            if (selectedFile === path) {
                setSelectedFile(null);
            }
        } catch (error) {
            console.error('Failed to delete:', error);
            alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleRenameFile = async (oldPath: string, newName: string) => {
        if (!fs) return;

        try {
            const newPath = path.join(path.dirname(oldPath), newName);

            await fs.moveFile(oldPath, newPath);

            if (selectedFile === oldPath) {
                setSelectedFile(newPath);
            }
        } catch (error) {
            console.error('Failed to rename:', error);
            alert(`Failed to rename: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleMoveFile = async () => {
        if (!fs || !moveSource || !moveDestination) return;

        try {
            await fs.moveFile(moveSource, moveDestination);

            if (selectedFile === moveSource) {
                setSelectedFile(moveDestination);
            }

            setMoveDialogOpen(false);
            setMoveSource('');
            setMoveDestination('');
        } catch (error) {
            console.error('Failed to move:', error);
            alert(`Failed to move: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleCopyFile = async () => {
        if (!fs || !copySource || !copyDestination) return;

        try {
            // Check if source is a directory
            const info = await fs.getInfo(copySource);
            if (info.isDirectory) {
                await fs.copyDirectory(copySource, copyDestination);
            } else {
                await fs.copyFile(copySource, copyDestination);
            }

            setCopyDialogOpen(false);
            setCopySource('');
            setCopyDestination('');
        } catch (error) {
            console.error('Failed to copy:', error);
            alert(`Failed to copy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleSaveFile = async () => {
        if (!fs || !selectedFile) return;

        try {
            await fs.writeFile(selectedFile, fileContent);
            setIsEditing(false);
            // Refresh to trigger re-read
        } catch (error) {
            console.error('Failed to save file:', error);
            alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const isBinaryFile = (content: string | Uint8Array | null) => {
        return (
            content === null ||
            content instanceof Uint8Array ||
            content === '[Binary file - cannot display]'
        );
    };

    return (
        <div className="flex h-screen flex-col bg-gray-950">
            {/* Header */}
            <div className="border-b border-gray-800 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-100">
                            Local File System Test
                        </h1>
                        <p className="mt-1 text-sm text-gray-400">
                            Test file operations on the local file system
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => {
                                setCreateType('file');
                                setCreateDialogOpen(true);
                            }}
                            size="sm"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            New File
                        </Button>
                        <Button
                            onClick={() => {
                                setCreateType('directory');
                                setCreateDialogOpen(true);
                            }}
                            size="sm"
                            variant="secondary"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            New Folder
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error messages */}
            {(fsError || localDirError || fileError) && (
                <Alert variant="destructive" className="m-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {fsError?.message || localDirError?.message || fileError?.message}
                    </AlertDescription>
                </Alert>
            )}

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* File Explorer */}
                <div className="w-80 overflow-hidden border-r border-gray-800">
                    <FileExplorer
                        files={localFiles}
                        selectedPath={selectedFile}
                        onSelectFile={setSelectedFile}
                        onDeleteFile={handleDeleteFile}
                        onRenameFile={handleRenameFile}
                        title="Local Files"
                        emptyMessage={
                            fsInitializing || localDirLoading
                                ? 'Loading local files...'
                                : 'No files yet. Create a file to get started.'
                        }
                        contextMenuItems={[
                            {
                                label: 'Move',
                                icon: Move,
                                onClick: (path) => {
                                    setMoveSource(path);
                                    setMoveDestination(path);
                                    setMoveDialogOpen(true);
                                },
                            },
                            {
                                label: 'Copy',
                                icon: Copy,
                                onClick: (path) => {
                                    setCopySource(path);
                                    setCopyDestination(path);
                                    setCopyDialogOpen(true);
                                },
                            },
                        ]}
                    />
                </div>

                {/* File Editor */}
                <div className="flex-1 overflow-hidden">
                    {selectedFile ? (
                        <div className="flex h-full flex-col">
                            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
                                <h2 className="text-sm font-medium text-gray-100">
                                    {selectedFile}
                                </h2>
                                <div className="flex gap-2">
                                    {!isBinaryFile(fileContent) && (
                                        <>
                                            {isEditing ? (
                                                <>
                                                    <Button size="sm" onClick={handleSaveFile}>
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => setIsEditing(false)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setIsEditing(true)}
                                                >
                                                    <Edit2 className="mr-2 h-4 w-4" />
                                                    Edit
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 p-4">
                                {isLoadingContent ? (
                                    <p className="text-gray-400">Loading...</p>
                                ) : isEditing ? (
                                    <Textarea
                                        value={fileContent}
                                        onChange={(e) => setFileContent(e.target.value)}
                                        className="h-full w-full resize-none border-gray-700 bg-gray-900 font-mono text-sm"
                                    />
                                ) : (
                                    <pre className="h-full overflow-auto rounded bg-gray-900 p-4 text-sm text-gray-100">
                                        {fileContent || '(Empty file)'}
                                    </pre>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                            Select a file to view its contents
                        </div>
                    )}
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Create {createType === 'file' ? 'File' : 'Directory'}
                        </DialogTitle>
                        <DialogDescription>
                            Enter the path for the new {createType}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="create-path">Path</Label>
                            <Input
                                id="create-path"
                                value={createPath}
                                onChange={(e) => setCreatePath(e.target.value)}
                                placeholder={createType === 'file' ? '/example.txt' : '/new-folder'}
                            />
                        </div>
                        {createType === 'file' && (
                            <div className="space-y-2">
                                <Label htmlFor="create-content">Content (optional)</Label>
                                <Textarea
                                    id="create-content"
                                    value={createContent}
                                    onChange={(e) => setCreateContent(e.target.value)}
                                    placeholder="File content..."
                                    className="h-32"
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateFile} disabled={!createPath}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Move Dialog */}
            <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Move File/Directory</DialogTitle>
                        <DialogDescription>
                            Enter the new path for the file or directory
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="move-source">From</Label>
                            <Input
                                id="move-source"
                                value={moveSource}
                                onChange={(e) => setMoveSource(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="move-dest">To</Label>
                            <Input
                                id="move-dest"
                                value={moveDestination}
                                onChange={(e) => setMoveDestination(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleMoveFile} disabled={!moveSource || !moveDestination}>
                            Move
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Copy Dialog */}
            <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Copy File/Directory</DialogTitle>
                        <DialogDescription>
                            Enter the destination path for the copy
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="copy-source">From</Label>
                            <Input
                                id="copy-source"
                                value={copySource}
                                onChange={(e) => setCopySource(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="copy-dest">To</Label>
                            <Input
                                id="copy-dest"
                                value={copyDestination}
                                onChange={(e) => setCopyDestination(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCopyFile} disabled={!copySource || !copyDestination}>
                            Copy
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
