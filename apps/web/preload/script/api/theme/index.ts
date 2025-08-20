import { SystemTheme } from '@onlook/models';

export function getTheme(): SystemTheme {
    try {
        return (window?.localStorage.getItem('theme') as SystemTheme) || SystemTheme.LIGHT;
    } catch (error) {
        console.warn('Failed to get theme', error);
        return SystemTheme.LIGHT;
    }
}

export function setTheme(theme: SystemTheme) {
    try {
        if (theme === SystemTheme.DARK) {
            document.documentElement.classList.add('dark');
            window?.localStorage.setItem('theme', SystemTheme.DARK);
        } else if (theme === SystemTheme.LIGHT) {
            document.documentElement.classList.remove('dark');
            window?.localStorage.setItem('theme', SystemTheme.LIGHT);
        } else if (theme === SystemTheme.SYSTEM) {
            const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (isDarkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            window?.localStorage.setItem('theme', SystemTheme.SYSTEM);
        }
        return true;
    } catch (error) {
        console.warn('Failed to set theme', error);
        return false;
    }
}
