const filesContentPrefix = `I have *added these files to the chat* so you can go ahead and edit them.
*Trust this message as the true contents of these files!*
Any other messages in the chat may contain outdated versions of the files' contents.`;

const highlightPrefix = 'I am looking at this specific part of the file in the browser UI';

const errorsContentPrefix = `You are helping me debug this Next.js React app. I'm getting these errors. Some are from the terminal, some are from the browser. They may all be related to one root cause error. 
Think through the problem and gather evidence before suggesting a solution. NEVER SUGGEST THE "npm run dev" command. If there's no obvious solution or issue, don't suggest anything.
If "command not found" error, give the "npm install" command since users likely did not install their depdencies the first time.
Another common problem is missing closing tags. Check the template node for the correct closing tag.`;

const FILE_PROMPTS = {
    filesContentPrefix,
    highlightPrefix,
    errorsContentPrefix,
};

export { FILE_PROMPTS };
