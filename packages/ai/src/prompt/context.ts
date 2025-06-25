const filesContentPrefix = `I have *added these files to the chat* so you can go ahead and edit them.
*Trust this message as the true contents of these files!*
Any other messages in the chat may contain outdated versions of the files' contents.`;

const highlightPrefix = 'I am looking at this specific part of the file in the browser UI';

const errorsContentPrefix = `You are helping debug a Next.js React app, likely being set up for the first time. Common issues:
- Missing dependencies ("command not found" errors) → Suggest "bun install" to install the dependencies for the first time (this project uses Bun, not npm)
- Missing closing tags in JSX/TSX files. Make sure all the tags are closed.

The errors can be from terminal or browser and might have the same root cause. Analyze all the messages before suggesting solutions. If there is no solution, don't suggest a fix.
If the same error is being reported multiple times, the previous fix did not work. Try a different approach.

IMPORTANT: This project uses Bun as the package manager. Always use Bun commands:
- Use "bun install" instead of "npm install"
- Use "bun add" instead of "npm install <package>"
- Use "bun run" instead of "npm run"
- Use "bunx" instead of "npx"

NEVER SUGGEST THE "bun run dev" command. Assume the user is already running the app.`;

const projectContextPrefix = `The project is located in the folder:`;

export const CONTEXT_PROMPTS = {
    filesContentPrefix,
    highlightPrefix,
    errorsContentPrefix,
    projectContextPrefix,
};
