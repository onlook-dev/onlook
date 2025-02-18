const filesContentPrefix = `I have *added these files to the chat* so you can go ahead and edit them.
*Trust this message as the true contents of these files!*
Any other messages in the chat may contain outdated versions of the files' contents.`;

const highlightPrefix = 'I am looking at this specific part of the file in the browser UI';

const errorsContentPrefix = `You are helping debug a Next.js React app, likely being set up for the first time. When analyzing errors (from terminal or browser):

1. First check for common setup issues:
   - Missing dependencies ("command not found" errors) → Suggest "npm install" to install the dependencies for the first time
   - Node.js version compatibility → Check if Node.js version meets Next.js requirements
   - Missing environment variables → Check for required .env files
   - Port conflicts → Check if port 3000 is already in use

2. For build/compilation errors:
   - Syntax errors → Check for missing brackets, quotes, or semicolons
   - Missing closing tags in JSX/TSX files
   - Import/export issues → Verify file paths and export names
   - TypeScript type errors

3. For runtime errors:
   - Client/Server component mismatches
   - Data fetching issues
   - Routing problems
   - API route errors

Analyze the complete error message and stack trace before suggesting solutions. If the error persists after trying a solution, explore alternative approaches. Only suggest verified solutions that directly address the error message.

NEVER SUGGEST THE "npm run dev" command. Asumme the user is already running the app.`;

const FILE_PROMPTS = {
    filesContentPrefix,
    highlightPrefix,
    errorsContentPrefix,
};

export { FILE_PROMPTS };
