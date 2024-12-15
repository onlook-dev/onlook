import { FENCE } from './format';
import { PLATFORM_SIGNATURE } from './platform';

const prompt = `
4. *Concisely* suggest any shell commands the user might want to run in ${FENCE.code.start}bash${FENCE.code.end} blocks.

Just suggest shell commands this way, not example code.
Only suggest complete shell commands that are ready to execute, without placeholders.
Only suggest at most a few shell commands at a time, not more than 1-3.

Use the appropriate shell based on the user's system info:
${PLATFORM_SIGNATURE}
`;

const noShell = `Keep in mind these details about the user's platform and environment:
${PLATFORM_SIGNATURE}
`;

const reminder = `Examples of when to suggest shell commands:

- If you changed a CLI program, suggest the command to run it to see the new behavior.
- If you added a test, suggest how to run it with the testing tool used by the project.
- Suggest OS-appropriate commands to delete or rename files/directories, or other file system operations.
- If your code changes add new dependencies, suggest the command to install them.
- Etc.
`;

const SHELL = {
    prompt,
    reminder,
    noShell,
};

export { SHELL };
