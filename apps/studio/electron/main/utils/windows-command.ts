export const escapeWindowsCommand = (command: string[]): string => {
    if (process.platform !== 'win32') {
        return command.join(' ');
    }

    return command
        .map((arg) => {
            // If it's already a properly quoted string, preserve it
            if (arg.startsWith('"') && arg.endsWith('"')) {
                return arg;
            }
            // If argument contains spaces or special characters, wrap in quotes
            if (arg.includes(' ') || /[&<>()@^|]/.test(arg)) {
                return `"${arg}"`;
            }
            return arg;
        })
        .join(' ');
};
