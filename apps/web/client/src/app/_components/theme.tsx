"use client";

import { SystemTheme } from '@onlook/models';
import localforage from 'localforage';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: SystemTheme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: SystemTheme;
    nextTheme: SystemTheme;
    setTheme: (theme: SystemTheme) => void;
};

const initialState: ThemeProviderState = {
    theme: SystemTheme.SYSTEM,
    nextTheme: SystemTheme.DARK,
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = SystemTheme.SYSTEM,
    storageKey = 'vite-ui-theme',
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<SystemTheme>(() => defaultTheme);
    const [nextTheme, setNextTheme] = useState<SystemTheme>(SystemTheme.DARK);

    useEffect(() => {
        localforage.getItem(storageKey).then((theme: unknown) => {
            setTheme(theme as SystemTheme || defaultTheme);
        });
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove('light', 'dark');

        if (theme === SystemTheme.SYSTEM) {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                ? SystemTheme.DARK
                : SystemTheme.LIGHT;

            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }

        const next: SystemTheme = (() => {
            switch (theme) {
                case SystemTheme.DARK:
                    return SystemTheme.LIGHT;
                case SystemTheme.LIGHT:
                    return SystemTheme.SYSTEM;
                case SystemTheme.SYSTEM:
                    return SystemTheme.DARK;
                default:
                    return SystemTheme.DARK;
            }
        })();

        setNextTheme(next);
    }, [theme]);

    const value = {
        theme,
        nextTheme,
        setTheme: (newTheme: SystemTheme) => {
            localforage.setItem(storageKey, newTheme);
            setTheme(newTheme);
        },
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
