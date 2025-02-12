import { parse, quote, type ParseEntry } from 'shell-quote';

export const replaceCommand = (command: string, newCommand: string): string => {
    const parsedArgs = parse(command);
    const [cmdName, ...cmdArgs]: (ParseEntry | undefined)[] = parsedArgs;
    const packageManagers = ['npm'];
    const finalCommand =
        (packageManagers.includes(cmdName?.toString() || '') ? newCommand : cmdName) || '';

    // For Windows, add '&' to the command to handle special characters
    if (process.platform === 'win32') {
        return (
            '& ' + quote([finalCommand.toString(), ...cmdArgs.map((arg) => arg?.toString() || '')])
        );
    }
    return quote([finalCommand.toString(), ...cmdArgs.map((arg) => arg?.toString() || '')]);
};
