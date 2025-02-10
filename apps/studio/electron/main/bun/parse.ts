import { parse, quote, type ParseEntry } from 'shell-quote';
import { escapeWindowsPath } from '../utils/windows-path';
import { escapeWindowsCommand } from '../utils/windows-command';

export const replaceCommand = (command: string, newCommand: string): string => {
    // For Windows, we need to handle command parsing differently to preserve quotes
    if (process.platform === 'win32') {
        const parts = command.split(' ');
        const [cmdName, ...cmdArgs] = parts;
        const packageManagers = ['npm'];
        const finalCommand = packageManagers.includes(cmdName)
            ? escapeWindowsPath(newCommand)
            : cmdName;
        return escapeWindowsCommand([finalCommand, ...cmdArgs]);
    }

    // For non-Windows platforms, use shell-quote as before
    const parsedArgs = parse(command);
    const [cmdName, ...cmdArgs]: (ParseEntry | undefined)[] = parsedArgs;
    const packageManagers = ['npm'];
    const finalCommand =
        (packageManagers.includes(cmdName?.toString() || '') ? newCommand : cmdName) || '';

    return quote([finalCommand.toString(), ...cmdArgs.map((arg) => arg?.toString() || '')]);
};
