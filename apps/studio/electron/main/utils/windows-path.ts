import { platform } from 'process';

export const escapeWindowsPath = (path: string): string => {
    if (platform !== 'win32') {
        return path;
    }

    // Escape spaces and special characters for PowerShell
    if (path.includes(' ') || /[&<>()@^|]/.test(path)) {
        return `"${path}"`;
    }

    return path;
};
