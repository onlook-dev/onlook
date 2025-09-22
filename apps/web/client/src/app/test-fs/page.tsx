'use client';

import { useOnlookFS, useFile, useDirectory } from '@/services/onlook-fs/hooks';
import type { FileEntry, FileChangeEvent } from '@/services/onlook-fs/types';
import { useState, useEffect } from 'react';
import { ContextMenu, type ContextMenuItem } from './components/ContextMenu';
import { RenameModal } from './components/RenameModal';

// Test with two different projects to verify isolation
const PROJECT_A = { id: 'project-a', branch: 'main' };
const PROJECT_B = { id: 'project-b', branch: 'feature' };

interface FileTreeProps {
    entries: FileEntry[];
    level?: number;
    onSelectFile: (path: string) => void;
    selectedFile: string | null;
    onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}

function FileTree({ entries, level = 0, onSelectFile, selectedFile, onContextMenu }: FileTreeProps) {
    return (
        <div className="space-y-0.5">
            {entries.map((entry) => (
                <div key={entry.path}>
                    <button
                        onClick={() => !entry.isDirectory && onSelectFile(entry.path)}
                        onContextMenu={(e) => onContextMenu(e, entry)}
                        className={`
                            w-full text-left px-3 py-1 rounded text-xs flex items-center
                            ${selectedFile === entry.path 
                                ? 'bg-blue-600 text-white' 
                                : 'hover:bg-gray-800 text-gray-300'}
                            ${entry.isDirectory ? 'font-medium' : ''}
                        `}
                        style={{ paddingLeft: `${level * 16 + 12}px` }}
                    >
                        <span className="mr-2">
                            {entry.isDirectory ? '📁' : '📄'}
                        </span>
                        {entry.name}
                    </button>
                    {entry.isDirectory && entry.children && (
                        <FileTree 
                            entries={entry.children}
                            level={level + 1}
                            onSelectFile={onSelectFile}
                            selectedFile={selectedFile}
                            onContextMenu={onContextMenu}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

interface EditorProps {
    projectId: string;
    branchId: string;
    path: string;
}

function Editor({ projectId, branchId, path }: EditorProps) {
    const { fs } = useOnlookFS(projectId, branchId);
    const { content, loading, error } = useFile(projectId, branchId, path);
    const [editorContent, setEditorContent] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (content && typeof content === 'string') {
            setEditorContent(content);
            setIsDirty(false);
        }
    }, [content]);

    const handleSave = async () => {
        if (!fs || !isDirty || isSaving) return;
        
        setIsSaving(true);
        try {
            await fs.writeFile(path, editorContent);
            setIsDirty(false);
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save on Cmd/Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    if (loading) return <div className="p-4 text-gray-500">Loading...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-900">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-200">{path}</span>
                    {isDirty && <span className="text-xs text-yellow-500">• Modified</span>}
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className={`
                        px-3 py-1 text-xs rounded transition-colors
                        ${isDirty && !isSaving
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                    `}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
            <div className="flex-1 p-4 bg-gray-950">
                <textarea
                    value={editorContent}
                    onChange={(e) => {
                        setEditorContent(e.target.value);
                        setIsDirty(e.target.value !== content);
                    }}
                    className="w-full h-full bg-gray-900 text-gray-100 font-mono text-xs p-3 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    spellCheck={false}
                />
            </div>
        </div>
    );
}

interface ProjectEditorProps {
    project: { id: string; branch: string };
    color: string;
}

function ProjectEditor({ project, color }: ProjectEditorProps) {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const { fs, isInitializing } = useOnlookFS(project.id, project.branch);
    const { entries, loading, error } = useDirectory(project.id, project.branch, '/');
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry } | null>(null);
    const [renameModal, setRenameModal] = useState<{ isOpen: boolean; entry: FileEntry | null }>({ isOpen: false, entry: null });

    const setupProject = async () => {
        if (!fs || isSettingUp) return;
        
        setIsSettingUp(true);
        try {
            // Create sample project structure
            await fs.createFile('/README.md', `# ${project.id}

This is the ${project.branch} branch.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`
`);
            
            await fs.createFile('/package.json', JSON.stringify({
                name: project.id,
                version: '1.0.0',
                scripts: {
                    dev: 'next dev',
                    build: 'next build',
                    start: 'next start'
                },
                dependencies: {
                    next: '14.0.0',
                    react: '^18.2.0',
                    'react-dom': '^18.2.0'
                }
            }, null, 2));
            
            await fs.createDirectory('/src');
            await fs.createFile('/src/index.ts', `// ${project.id} entry point
export const projectName = '${project.id}';
export const branch = '${project.branch}';

console.log(\`Running \${projectName} on \${branch}\`);
`);
            
            await fs.createDirectory('/src/components');
            await fs.createFile('/src/components/Button.tsx', `export function Button({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
            {children}
        </button>
    );
}`);
            
            await fs.createFile('/src/components/Card.tsx', `interface CardProps {
    title: string;
    children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            {children}
        </div>
    );
}`);

            await fs.createFile('/.gitignore', `# Dependencies
node_modules/

# Production
build/
dist/

# Misc
.DS_Store
*.log
`);
            
            // Select the README by default
            setSelectedFile('/README.md');
        } catch (err) {
            console.error('Failed to setup project:', err);
        } finally {
            setIsSettingUp(false);
        }
    };

    const hasFiles = entries.length > 0;

    const handleContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, entry });
    };

    const handleRename = async (oldPath: string, newName: string) => {
        if (!fs) return;

        try {
            const directory = oldPath.substring(0, oldPath.lastIndexOf('/'));
            const newPath = directory ? `${directory}/${newName}` : `/${newName}`;
            
            // Check if it's a file or directory
            const info = await fs.getInfo(oldPath);
            if (info.isDirectory) {
                await fs.moveDirectory(oldPath, newPath);
            } else {
                await fs.moveFile(oldPath, newPath);
            }
            
            // Update selected file if it was renamed
            if (selectedFile === oldPath) {
                setSelectedFile(newPath);
            }
        } catch (err) {
            console.error('Failed to rename:', err);
            alert('Failed to rename: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleDelete = async (path: string) => {
        if (!fs) return;

        const confirmDelete = window.confirm(`Are you sure you want to delete "${path}"?`);
        if (!confirmDelete) return;

        try {
            const info = await fs.getInfo(path);
            if (info.isDirectory) {
                await fs.deleteDirectory(path);
            } else {
                await fs.deleteFile(path);
            }
            
            // Clear selection if deleted file was selected
            if (selectedFile === path) {
                setSelectedFile(null);
            }
        } catch (err) {
            console.error('Failed to delete:', err);
            alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const contextMenuItems: ContextMenuItem[] = contextMenu ? [
        ...(contextMenu.entry.isDirectory ? [
            {
                label: 'New File',
                onClick: async () => {
                    const fileName = window.prompt('Enter file name:');
                    if (fileName && fs) {
                        try {
                            const newPath = `${contextMenu.entry.path}/${fileName}`;
                            await fs.createFile(newPath, '');
                            setSelectedFile(newPath);
                        } catch (err) {
                            console.error('Failed to create file:', err);
                            alert('Failed to create file: ' + (err instanceof Error ? err.message : 'Unknown error'));
                        }
                    }
                }
            },
            {
                label: 'New Directory',
                onClick: async () => {
                    const dirName = window.prompt('Enter directory name:');
                    if (dirName && fs) {
                        try {
                            const newPath = `${contextMenu.entry.path}/${dirName}`;
                            await fs.createDirectory(newPath);
                        } catch (err) {
                            console.error('Failed to create directory:', err);
                            alert('Failed to create directory: ' + (err instanceof Error ? err.message : 'Unknown error'));
                        }
                    }
                }
            }
        ] : []),
        {
            label: 'Rename',
            onClick: () => {
                setRenameModal({ isOpen: true, entry: contextMenu.entry });
            }
        },
        {
            label: 'Delete',
            onClick: () => handleDelete(contextMenu.entry.path),
            destructive: true
        }
    ] : [];

    return (
        <div className={`flex-1 flex flex-col border-2 ${color} bg-gray-950`}>
            <div className="bg-gray-900 px-4 py-3 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-100">
                    {project.id} / {project.branch}
                </h2>
            </div>
            
            <div className="flex-1 flex min-h-0">
                {/* File Browser */}
                <div className="w-48 bg-gray-900 border-r border-gray-800 flex flex-col">
                    <div 
                        className="flex-1 overflow-y-auto"
                        onContextMenu={(e) => {
                            // Only trigger if clicking on empty space, not on a child element
                            if (e.target === e.currentTarget && hasFiles) {
                                e.preventDefault();
                                setContextMenu({ 
                                    x: e.clientX, 
                                    y: e.clientY, 
                                    entry: { 
                                        name: '/', 
                                        path: '/', 
                                        isDirectory: true 
                                    } 
                                });
                            }
                        }}
                    >
                        {isInitializing || loading ? (
                            <div className="p-4 text-gray-500 text-sm">Loading...</div>
                        ) : error ? (
                            <div className="p-4 text-red-500 text-sm">Error: {error.message}</div>
                        ) : hasFiles ? (
                            <div className="py-2">
                                <FileTree 
                                    entries={entries}
                                    onSelectFile={setSelectedFile} 
                                    selectedFile={selectedFile}
                                    onContextMenu={handleContextMenu}
                                />
                            </div>
                        ) : (
                            <div className="p-4 flex flex-col items-center justify-center h-full">
                                <div className="text-gray-500 text-sm mb-4">No files yet</div>
                                <button
                                    onClick={setupProject}
                                    disabled={isSettingUp || !fs}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm transition-colors"
                                >
                                    {isSettingUp ? 'Setting up...' : 'Setup Project'}
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Watch Events Log */}
                    <WatchEventsLog projectId={project.id} branchId={project.branch} />
                </div>
                
                {/* Editor */}
                <div className="flex-1 bg-gray-950">
                    {selectedFile ? (
                        <Editor 
                            key={`${project.id}-${project.branch}-${selectedFile}`}
                            projectId={project.id}
                            branchId={project.branch}
                            path={selectedFile} 
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                            {hasFiles ? 'Select a file to edit' : 'Setup project to get started'}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenuItems}
                    onClose={() => setContextMenu(null)}
                />
            )}
            
            {/* Rename Modal */}
            <RenameModal
                isOpen={renameModal.isOpen}
                currentName={renameModal.entry?.name || ''}
                isDirectory={renameModal.entry?.isDirectory}
                onClose={() => setRenameModal({ isOpen: false, entry: null })}
                onRename={(newName) => {
                    if (renameModal.entry) {
                        handleRename(renameModal.entry.path, newName);
                        setRenameModal({ isOpen: false, entry: null });
                    }
                }}
            />
        </div>
    );
}

// Component to show file system watch events
function WatchEventsLog({ projectId, branchId }: { projectId: string; branchId: string }) {
    const [events, setEvents] = useState<Array<FileChangeEvent & { timestamp: Date }>>([]);
    const { fs } = useOnlookFS(projectId, branchId);

    useEffect(() => {
        if (!fs) return;

        const cleanup = fs.watchDirectory('/', (event) => {
            setEvents(prev => [...prev, { ...event, timestamp: new Date() }].slice(-5));
        });

        return cleanup;
    }, [fs]);

    if (events.length === 0) return null;

    return (
        <div className="border-t border-gray-800 p-2 text-xs">
            <div className="text-gray-500 mb-1">Recent changes:</div>
            {events.map((event, i) => (
                <div key={i} className="text-gray-400 truncate">
                    {event.type} {event.path}
                </div>
            ))}
        </div>
    );
}

export default function TestFSPage() {
    return (
        <div className="h-screen bg-gray-950 text-gray-100 flex flex-col">
            <div className="border-b border-gray-800 px-6 py-4 bg-gray-900">
                <h1 className="text-xl font-semibold">OnlookFS Test - Multiple Instances</h1>
                <p className="text-sm text-gray-400 mt-1">
                    Testing file system isolation and synchronization with 4 editor instances
                </p>
            </div>

            <div className="flex-1 flex flex-col gap-0.5 p-4 bg-black">
                {/* Top row - Project A */}
                <div className="flex-1 flex gap-0.5">
                    <ProjectEditor project={PROJECT_A} color="border-blue-500" />
                    <ProjectEditor project={PROJECT_A} color="border-blue-400" />
                </div>
                
                {/* Bottom row - Project B */}
                <div className="flex-1 flex gap-0.5">
                    <ProjectEditor project={PROJECT_B} color="border-green-500" />
                    <ProjectEditor project={PROJECT_B} color="border-green-400" />
                </div>
            </div>
        </div>
    );
}