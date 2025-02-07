import { parse, quote } from 'shell-quote';

export const replaceCommand = (command: string, newCommand: string): string => {
    const parsedArgs = parse(command);
    const [cmdName, ...cmdArgs] = parsedArgs;

    const packageManagers = ['npm'];
    const finalCommand = (packageManagers.includes(cmdName as string) ? newCommand : cmdName) || '';

    // Use shell-quote's quote function to properly handle quoted arguments
    return quote([finalCommand.toString(), ...cmdArgs.map((arg) => arg.toString())]);
};
