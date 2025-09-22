'use client';

import { useOnlookFS, useFile, useDirectory } from '@/services/onlook-fs/hooks';
import type { FileEntry } from '@/services/onlook-fs/hooks/useDirectory';
import { useState, useEffect } from 'react';

// Test with hardcoded project/branch for now
const TEST_PROJECT_ID = 'test-project';
const TEST_BRANCH_ID = 'test-branch';

interface FileTreeProps {
    entries: FileEntry[];
    level?: number;
    onSelectFile: (path: string) => void;
    selectedFile: string | null;
    expandedDirs: Set<string>;
    onToggleDir: (path: string) => void;
}

function FileTree({
    entries,
    level = 0,
    onSelectFile,
    selectedFile,
    expandedDirs,
    onToggleDir,
}: FileTreeProps) {
    return (
        <div className="space-y-0.5">
            {entries.map((entry) => (
                <div key={entry.path}>
                    <button
                        onClick={() =>
                            entry.isDirectory ? onToggleDir(entry.path) : onSelectFile(entry.path)
                        }
                        className={`
                            w-full text-left px-3 py-1 rounded text-sm flex items-center
                            ${
                                selectedFile === entry.path
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-gray-800 text-gray-300'
                            }
                        `}
                        style={{ paddingLeft: `${level * 16 + 12}px` }}
                    >
                        <span className="mr-2">
                            {entry.isDirectory
                                ? expandedDirs.has(entry.path)
                                    ? '📂'
                                    : '�'
                                : '📄'}
                        </span>
                        {entry.name}
                    </button>
                    {entry.isDirectory && expandedDirs.has(entry.path) && entry.children && (
                        <FileTree
                            entries={entry.children}
                            level={level + 1}
                            onSelectFile={onSelectFile}
                            selectedFile={selectedFile}
                            expandedDirs={expandedDirs}
                            onToggleDir={onToggleDir}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

function FileBrowser({
    onSelectFile,
    selectedFile,
}: {
    onSelectFile: (path: string) => void;
    selectedFile: string | null;
}) {
    const { entries, loading, error } = useDirectory(TEST_PROJECT_ID, TEST_BRANCH_ID, '/');
    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));

    const toggleDir = (dirPath: string) => {
        setExpandedDirs((prev) => {
            const next = new Set(prev);
            if (next.has(dirPath)) {
                next.delete(dirPath);
            } else {
                next.add(dirPath);
            }
            return next;
        });
    };

    if (loading) return <div className="p-4 text-gray-500">Loading...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Files
                </h2>
                {entries.length === 0 ? (
                    <div className="text-gray-500 text-sm">No files yet...</div>
                ) : (
                    <FileTree
                        entries={entries}
                        onSelectFile={onSelectFile}
                        selectedFile={selectedFile}
                        expandedDirs={expandedDirs}
                        onToggleDir={toggleDir}
                    />
                )}
            </div>
        </div>
    );
}

function Editor({ path }: { path: string }) {
    const { fs } = useOnlookFS(TEST_PROJECT_ID, TEST_BRANCH_ID);
    const { content, loading, error } = useFile(TEST_PROJECT_ID, TEST_BRANCH_ID, path);
    const [editorContent, setEditorContent] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (content && typeof content === 'string') {
            console.log('File content updated:', path, 'length:', content.length);
            setEditorContent(content);
            setIsDirty(false);
        }
    }, [content, path]);

    const handleSave = async () => {
        if (!fs || !isDirty) return;

        setIsSaving(true);
        try {
            console.log('Saving file:', path, 'with content length:', editorContent.length);
            await fs.writeFile(path, editorContent);
            console.log('File saved successfully');
            // Don't set isDirty to false here - let the content update handle it
            // This prevents race conditions where we set false then immediately true again
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (value: string) => {
        setEditorContent(value);
        setIsDirty(value !== content);
    };

    if (loading) return <div className="p-4">Loading file...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{path}</span>
                    {isDirty && <span className="text-xs text-yellow-500">• Modified</span>}
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className={`
                        px-3 py-1 text-sm rounded
                        ${
                            isDirty
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }
                    `}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
            <div className="flex-1 p-4">
                <textarea
                    value={editorContent}
                    onChange={(e) => handleChange(e.target.value)}
                    className="w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    spellCheck={false}
                />
            </div>
        </div>
    );
}

function FileSystemInit() {
    const { fs, isInitializing } = useOnlookFS(TEST_PROJECT_ID, TEST_BRANCH_ID);
    const [isCreating, setIsCreating] = useState(false);

    const createSampleFiles = async () => {
        if (!fs) return;

        setIsCreating(true);
        try {
            // Create some sample files
            await fs.writeFile(
                '/README.md',
                '# Test Project\n\nThis is a test file system implementation using ZenFS.',
            );
            await fs.writeFile('/index.js', 'console.log("Hello from OnlookFS!");');
            await fs.writeFile(
                '/style.css',
                'body {\n  margin: 0;\n  padding: 0;\n  font-family: sans-serif;\n}',
            );
            await fs.mkdir('/src', { recursive: true });
            await fs.writeFile(
                '/src/App.jsx',
                'export function App() {\n  return <div>Hello World!</div>;\n}',
            );
        } catch (err) {
            console.error('Failed to create files:', err);
        } finally {
            setIsCreating(false);
        }
    };

    if (isInitializing) {
        return <div className="p-4">Initializing file system...</div>;
    }

    return (
        <button
            onClick={createSampleFiles}
            disabled={isCreating}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
        >
            {isCreating ? 'Creating...' : 'Create Sample Files'}
        </button>
    );
}

export default function TestFSPage() {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    return (
        <div className="h-screen bg-gray-950 text-gray-100 flex flex-col">
            <div className="border-b border-gray-800 px-6 py-4">
                <h1 className="text-xl font-semibold">OnlookFS Editor</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Project: {TEST_PROJECT_ID} | Branch: {TEST_BRANCH_ID}
                </p>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-64 bg-gray-900 border-r border-gray-800">
                    <FileBrowser onSelectFile={setSelectedFile} selectedFile={selectedFile} />
                    {/* <div className="p-4 border-t border-gray-800">
                        <FileSystemInit />
                    </div> */}
                </div>

                <div className="flex-1 bg-gray-950">
                    {selectedFile ? (
                        <Editor key={selectedFile} path={selectedFile} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            Select a file to edit
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
