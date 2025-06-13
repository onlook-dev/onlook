'use client';

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type ImportType = 'local' | 'github' | null;

interface ImportContextType {
    selectedImportType: ImportType;
    setSelectedImportType: (type: ImportType) => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export const ImportProvider = ({ children }: { children: ReactNode }) => {
    const [selectedImportType, setSelectedImportType] = useState<ImportType>(null);

    return (
        <ImportContext.Provider value={{ selectedImportType, setSelectedImportType }}>
            {children}
        </ImportContext.Provider>
    );
};

export const useImport = () => {
    const context = useContext(ImportContext);
    if (context === undefined) {
        throw new Error('useImport must be used within an ImportProvider');
    }
    return context;
}; 