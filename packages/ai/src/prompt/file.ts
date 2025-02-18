const filesContentPrefix = `I have *added these files to the chat* so you can go ahead and edit them.
*Trust this message as the true contents of these files!*
Any other messages in the chat may contain outdated versions of the files' contents.`;

const highlightPrefix = 'I am looking at this specific part of the file in the browser UI';

const errorsContentPrefix = `You are helping me debug this Next.js React app. I'm getting these errors. Some are from the terminal, some are from the browser. Terminal errors may be related to the packages not being installed. In this case, give the install command.`;

const FILE_PROMPTS = {
    filesContentPrefix,
    highlightPrefix,
    errorsContentPrefix,
};

export { FILE_PROMPTS };
