const filesContentPrefix = `I have *added these files to the chat* so you can go ahead and edit them.
*Trust this message as the true contents of these files!*
Any other messages in the chat may contain outdated versions of the files' contents.`;

const highlightPrefix = 'I am looking at this specific part of the file in the browser UI';

const errorsContentPrefix = `You are helping debug a Next.js React app, likely being set up for the first time. When analyzing errors (from terminal or browser):
Common issues:
Missing dependencies ("command not found" errors) → Suggest "npm install" to install the dependencies for the first time
Missing closing tags in JSX/TSX files. Make sure all the tags are closed.

The errors might have the same root cause. Analyze all the messages before suggesting solutions. If there is no solution, don't suggest a fix.
If the same error is being reported multiple times, the previous fix did not work. Try a different approach.

NEVER SUGGEST THE "npm run dev" command. Asumme the user is already running the app.`;

export const CONTEXT_PROMPTS = {
    filesContentPrefix,
    highlightPrefix,
    errorsContentPrefix,
};
