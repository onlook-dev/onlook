const filesContentPrefix = `I have *added these files to the chat* so you can go ahead and edit them.
*Trust this message as the true contents of these files!*
Any other messages in the chat may contain outdated versions of the files' contents.`;

const selectedContentPrefix = 'I am looking at this specific part of the code in the browser UI';

const FILE_PROMPTS = {
    filesContentPrefix,
    selectedContentPrefix,
};

export { FILE_PROMPTS };
