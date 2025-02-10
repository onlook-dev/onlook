import { parse, quote, type ParseEntry } from 'shell-quote';

export const replaceCommand = (command: string, newCommand: string): string => {
    const parsedArgs = parse(command);
    const [cmdName, ...cmdArgs]: (ParseEntry | undefined)[] = parsedArgs;
    const packageManagers = ['npm'];
    const finalCommand =
        (packageManagers.includes(cmdName?.toString() || '') ? newCommand : cmdName) || '';

    // Use shell-quote's quote function to properly handle quoted arguments
    return quote([finalCommand.toString(), ...cmdArgs.map((arg) => arg?.toString() || '')]);
};
