"use client";
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    nextTheme: Theme;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: 'system',
    nextTheme: 'dark',
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'vite-ui-theme',
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(() => defaultTheme);
    const [nextTheme, setNextTheme] = useState<Theme>('dark');

    useEffect(() => {
        setTheme(window?.localStorage?.getItem(storageKey) as Theme || defaultTheme);
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';

            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }

        const next: Theme = (() => {
            switch (theme) {
                case 'dark':
                    return 'light';
                case 'light':
                    return 'system';
                case 'system':
                    return 'dark';
                default:
                    return 'dark';
            }
        })();

        setNextTheme(next);
    }, [theme]);

    const value = {
        theme,
        nextTheme,
        setTheme: (newTheme: Theme) => {
            localStorage?.setItem(storageKey, newTheme);
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
