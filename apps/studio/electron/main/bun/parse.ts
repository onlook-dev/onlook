export const parseCommandAndArgs = (
    command: string,
    args: string[] = [],
    newCommand: string,
): { finalCommand: string; allArgs: string[] } => {
    // Parse command string while preserving quoted arguments
    const parsedArgs = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const [cmdName, ...cmdArgs] = parsedArgs.map((arg) =>
        // Remove surrounding quotes if present
        arg.replace(/^["'](.+)["']$/, '$1'),
    );

    const packageManagers = ['npm', 'bun', 'pnpm'];
    const finalCommand = (packageManagers.includes(cmdName) ? newCommand : cmdName) || '';
    const allArgs = [...cmdArgs, ...args];

    return { finalCommand, allArgs };
};
