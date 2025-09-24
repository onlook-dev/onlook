import { useEffect, useRef, useState } from 'react';

interface RenameModalProps {
    isOpen: boolean;
    currentName: string;
    isDirectory?: boolean;
    onClose: () => void;
    onRename: (newName: string) => void;
}

export function RenameModal({
    isOpen,
    currentName,
    isDirectory = false,
    onClose,
    onRename,
}: RenameModalProps) {
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
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="w-80 rounded-lg bg-gray-800 p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-100">
                    Rename {isDirectory ? 'Directory' : 'File'}
                </h3>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
                        placeholder="Enter new name"
                    />
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-300 transition-colors hover:text-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!newName.trim() || newName === currentName}
                            className="rounded bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500"
                        >
                            Rename
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
