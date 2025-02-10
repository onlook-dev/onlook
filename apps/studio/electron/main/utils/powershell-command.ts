export const buildPowerShellCommand = (executable: string, args: string[] = []): string => {
    // PowerShell requires & operator before quoted paths with spaces
    const needsQuotes = executable.includes(' ') || /[&<>()@^|]/.test(executable);
    const quotedExecutable = needsQuotes ? `"${executable}"` : executable;

    // Build command with & operator for PowerShell
    const command = `& ${quotedExecutable}`;

    // Handle arguments, preserving any existing quotes
    const processedArgs = args.map((arg) => {
        if (arg.startsWith('"') && arg.endsWith('"')) {
            return arg; // Preserve existing quotes
        }
        return arg.includes(' ') ? `"${arg}"` : arg;
    });

    return processedArgs.length > 0 ? `${command} ${processedArgs.join(' ')}` : command;
};

export const isPowerShellCommand = (command: string): boolean => {
    return process.platform === 'win32';
};
