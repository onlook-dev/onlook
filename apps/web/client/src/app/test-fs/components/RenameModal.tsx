import { useState, useEffect, useRef } from 'react';

interface RenameModalProps {
    isOpen: boolean;
    currentName: string;
    isDirectory?: boolean;
    onClose: () => void;
    onRename: (newName: string) => void;
}

export function RenameModal({ isOpen, currentName, isDirectory = false, onClose, onRename }: RenameModalProps) {
    const [newName, setNewName] = useState(currentName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setNewName(currentName);
            // Focus and select the text after a brief delay
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        }
    }, [isOpen, currentName]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim() && newName !== currentName) {
            onRename(newName.trim());
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-80">
                <h3 className="text-lg font-semibold mb-4 text-gray-100">Rename {isDirectory ? 'Directory' : 'File'}</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 text-gray-100 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                        placeholder="Enter new name"
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-300 hover:text-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!newName.trim() || newName === currentName}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
                        >
                            Rename
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}