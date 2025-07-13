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

const imageContextPrefix = `*IMPORTANT: Use only the images provided in this current message. Previous messages may contain outdated image versions.*
## IMAGE INTENT ANALYSIS
Determine if images should be imported to project or used as reference only based on the user instructions:
## EXECUTION:
### If USE IN PROJECT:
1. Use create_image tool to save image in the file system with the following parameters:
   - path: Save to public directory with full path (e.g., public/images/new-logo.png)
   - fileId: The unique ID of the specific image being saved2. Generate Next.js Image component in code
2. IMPORTANT: Always use the Next.js Image component for images in the project.
3. Ensure images are responsive and adapt to different screen sizes
### If REFERENCE ONLY:
- Use image details to improve code quality, styling, or layout
- Apply visual patterns, color schemes, or design principles
- DO NOT use create_image tool

When uncertain, ask for clarification.`;

export const CONTEXT_PROMPTS = {
    filesContentPrefix,
    highlightPrefix,
    errorsContentPrefix,
    projectContextPrefix,
    imageContextPrefix,
};
