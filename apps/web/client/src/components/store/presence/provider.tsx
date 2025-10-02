'use client';

import { PresenceManager } from './manager';
import { useRef, useEffect, createContext, useContext } from 'react';

const PresenceContext = createContext<PresenceManager | null>(null);

export const PresenceProvider = ({ children }: { children: React.ReactNode }) => {
    const presenceManagerRef = useRef<PresenceManager | null>(null);

    useEffect(() => {
        presenceManagerRef.current = new PresenceManager();

        return () => {
            presenceManagerRef.current?.dispose();
        };
    }, []);

    if (!presenceManagerRef.current) {
        return null; // Or a loading state
    }

    return (
        <PresenceContext.Provider value={presenceManagerRef.current}>
            {children}
        </PresenceContext.Provider>
    );
};

export const usePresenceManager = () => {
    const context = useContext(PresenceContext);
    if (!context) {
        throw new Error('usePresenceManager must be used within a PresenceProvider');
    }
    return context;
};
