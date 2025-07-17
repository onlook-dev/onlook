import { parse, quote, type ParseEntry } from 'shell-quote';

export const replaceCommand = (command: string, newCommand: string): string => {
    const parsedArgs = parse(command);
    const [cmdName, ...cmdArgs]: (ParseEntry | undefined)[] = parsedArgs;
    const packageManagers = ['npm'];
    const finalCommand =
        (packageManagers.includes(cmdName?.toString() || '') ? newCommand : cmdName) || '';

    // For Windows, add '&' to the command to handle special characters
    if (process.platform === 'win32') {
        const executable = `"${finalCommand.toString()}"`;
        // This is a simplification and assumes args don't need complex escaping.
        const args = cmdArgs.map((arg) => arg?.toString() || '');
        const fullCommand = [executable, ...args].join(' ');
        return `& ${fullCommand}`;
    }
    return quote([finalCommand.toString(), ...cmdArgs.map((arg) => arg?.toString() || '')]);
};
