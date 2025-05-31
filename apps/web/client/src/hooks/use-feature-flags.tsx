'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { env } from '../env';

type ClientEnvKeys = keyof typeof env;

type FeatureFlags = Record<ClientEnvKeys, boolean>;

interface FeatureFlagsContextType {
    isEnabled: <K extends ClientEnvKeys>(flag: K) => boolean;
    flags: FeatureFlags;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export const useFeatureFlags = () => {
    const context = useContext(FeatureFlagsContext);
    if (!context) {
        throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
    }
    return context;
};

interface FeatureFlagsProviderProps {
    children: ReactNode;
}

export const FeatureFlagsProvider = ({ children }: FeatureFlagsProviderProps) => {
    const flags = Object.keys(env).reduce((acc, key) => {
        const envKey = key as ClientEnvKeys;
        acc[envKey] = env[envKey] === 'true' || env[envKey] === true;
        return acc;
    }, {} as FeatureFlags);

    const isEnabled = <K extends ClientEnvKeys>(flag: K): boolean => {
        return flags[flag] || false;
    };

    return (
        <FeatureFlagsContext.Provider value={{ isEnabled, flags }}>
            {children}
        </FeatureFlagsContext.Provider>
    );
};
