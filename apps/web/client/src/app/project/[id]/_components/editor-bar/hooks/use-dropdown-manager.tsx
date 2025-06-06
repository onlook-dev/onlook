'use client';

import type { ReactNode } from 'react';
import React, { createContext, useCallback, useContext, useState } from 'react';

interface DropdownManagerContextType {
    openDropdownId: string | null;
    registerDropdown: (id: string, onClose: () => void) => void;
    unregisterDropdown: (id: string) => void;
    openDropdown: (id: string) => void;
    closeDropdown: (id: string) => void;
    closeAllDropdowns: () => void;
}

const DropdownManagerContext = createContext<DropdownManagerContextType | null>(null);

interface DropdownManagerProviderProps {
    children: ReactNode;
}

export const DropdownManagerProvider = ({ children }: DropdownManagerProviderProps) => {
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [dropdownCallbacks, setDropdownCallbacks] = useState<Map<string, () => void>>(new Map());

    const registerDropdown = useCallback((id: string, onClose: () => void) => {
        setDropdownCallbacks(prev => new Map(prev).set(id, onClose));
    }, []);

    const unregisterDropdown = useCallback((id: string) => {
        setDropdownCallbacks(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });
    }, []);

    const openDropdown = useCallback((id: string) => {
        // Close the currently open dropdown if it's different
        if (openDropdownId && openDropdownId !== id) {
            const closeCallback = dropdownCallbacks.get(openDropdownId);
            if (closeCallback) {
                closeCallback();
            }
        }
        setOpenDropdownId(id);
    }, [openDropdownId, dropdownCallbacks]);

    const closeDropdown = useCallback((id: string) => {
        if (openDropdownId === id) {
            setOpenDropdownId(null);
        }
    }, [openDropdownId]);

    const closeAllDropdowns = useCallback(() => {
        if (openDropdownId) {
            const closeCallback = dropdownCallbacks.get(openDropdownId);
            if (closeCallback) {
                closeCallback();
            }
        }
        setOpenDropdownId(null);
    }, [openDropdownId, dropdownCallbacks]);

    const contextValue: DropdownManagerContextType = {
        openDropdownId,
        registerDropdown,
        unregisterDropdown,
        openDropdown,
        closeDropdown,
        closeAllDropdowns,
    };

    return (
        <DropdownManagerContext.Provider value={contextValue}>
            {children}
        </DropdownManagerContext.Provider>
    );
};

export const useDropdownManager = () => {
    const context = useContext(DropdownManagerContext);
    if (!context) {
        throw new Error('useDropdownManager must be used within a DropdownManagerProvider');
    }
    return context;
};

interface UseDropdownControlProps {
    id: string;
    onOpenChange?: (open: boolean) => void;
    isOverflow?: boolean;
}

export const useDropdownControl = ({ id, onOpenChange, isOverflow = false }: UseDropdownControlProps) => {
    const { openDropdownId, registerDropdown, unregisterDropdown, openDropdown, closeDropdown } = useDropdownManager();
    const [isOpen, setIsOpen] = useState(false);

    const handleOpenChange = useCallback((open: boolean) => {
        if (open) {
            openDropdown(id);
            setIsOpen(true);
        } else {
            closeDropdown(id);
            setIsOpen(false);
        }
        onOpenChange?.(open);
    }, [id, openDropdown, closeDropdown, onOpenChange]);

    const handleClose = useCallback(() => {
        if (isOverflow) return;
        setIsOpen(false);
        onOpenChange?.(false);
    }, [onOpenChange, isOverflow]);

    // Register/unregister the dropdown
    React.useEffect(() => {
        registerDropdown(id, handleClose);
        return () => unregisterDropdown(id);
    }, [id, registerDropdown, unregisterDropdown, handleClose]);

    // Sync with global state
    React.useEffect(() => {
        const shouldBeOpen = openDropdownId === id;
        if (!isOverflow && isOpen !== shouldBeOpen) {
            setIsOpen(shouldBeOpen);
            onOpenChange?.(shouldBeOpen);
        }
    }, [openDropdownId, id, isOpen, onOpenChange]);

    return {
        isOpen,
        onOpenChange: handleOpenChange,
    };
}; 