import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
    label: string;
    onClick: () => void;
    destructive?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="fixed bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50"
            style={{ left: x, top: y }}
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => {
                        item.onClick();
                        onClose();
                    }}
                    className={`
                        w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors
                        ${item.destructive ? 'text-red-400 hover:text-red-300' : 'text-gray-200'}
                    `}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
}