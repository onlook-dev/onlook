import { parse, quote, type ParseEntry } from 'shell-quote';
import { buildPowerShellCommand, isPowerShellCommand } from '../utils/powershell-command';

export const replaceCommand = (command: string, newCommand: string): string => {
    const parsedArgs = parse(command);
    const [cmdName, ...cmdArgs]: (ParseEntry | undefined)[] = parsedArgs;
    const packageManagers = ['npm'];

    // For PowerShell, we need special handling
    if (isPowerShellCommand(command)) {
        if (packageManagers.includes(cmdName?.toString() || '')) {
            return buildPowerShellCommand(
                newCommand,
                cmdArgs.map((arg) => arg?.toString() || ''),
            );
        }
        return command; // Non-npm commands are passed through unchanged
    }

    // For non-Windows platforms, use shell-quote as before
    const finalCommand =
        (packageManagers.includes(cmdName?.toString() || '') ? newCommand : cmdName) || '';
    return quote([finalCommand.toString(), ...cmdArgs.map((arg) => arg?.toString() || '')]);
};
