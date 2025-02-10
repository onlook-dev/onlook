export const escapeWindowsPath = (path: string): string => {
    if (process.platform !== 'win32') {
        return path;
    }

    // Escape spaces and special characters for PowerShell
    if (path.includes(' ') || /[&<>()@^|]/.test(path)) {
        // Ensure path is wrapped in double quotes for PowerShell
        return path.startsWith('"') && path.endsWith('"') ? path : `"${path}"`;
    }

    return path;
};
