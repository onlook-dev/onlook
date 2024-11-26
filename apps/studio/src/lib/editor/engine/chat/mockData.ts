import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';

export const GREETING_MSG = new AssistantChatMessageImpl(
    [
        {
            type: 'text',
            text: 'Click on any element to chat with it. Try to be as detailed as possible for the best results!',
        },
    ],
    [],
);

const MOCK_USER_MSG = new UserChatMessageImpl('Test message with some selected files', [
    {
        type: 'file',
        name: '/Users/kietho/workplace/onlook/test/test/app/page.tsx',
        value: 'export const Hello = 0;',
    },
    {
        type: 'selected',
        name: 'Component',
        value: 'export const Hello = 0;',
        templateNode: {
            path: 'path/to/file',
            startTag: {
                start: {
                    line: 1,
                    column: 1,
                },
                end: {
                    line: 1,
                    column: 10,
                },
            },
            endTag: null,
            component: null,
        },
    },
    {
        type: 'image',
        name: 'screenshot.png',
        value: 'https://example.com/screenshot',
    },
    {
        type: 'image',
        name: 'logo.svg',
        value: 'https://example.com/logo',
    },
]);

const MOCK_ASSISTANT_MSG = new AssistantChatMessageImpl(
    [
        {
            type: 'text',
            text: "Okay, let's update the code to make the copy more enticing. Here are the changes:",
        },
        {
            type: 'code',
            fileName: '/Users/kietho/workplace/onlook/test/test/app/page.tsx',
            value: 'export const World = 0;',
        },
    ],
    MOCK_USER_MSG.context,
);

export const MOCK_STREAMING_ASSISTANT_MSG = new AssistantChatMessageImpl(
    [
        {
            type: 'text',
            text: 'I am currently talking...',
        },
        {
            type: 'code',
            fileName: '/Users/kietho/workplace/onlook/test/test/app/page.tsx',
            value: 'export const;',
        },
    ],
    MOCK_USER_MSG.context,
);

export const MOCK_CHAT_MESSAGES = [
    new AssistantChatMessageImpl([
        {
            type: 'text',
            text: 'Hello! How can I assist you today?',
        },
    ]),
    MOCK_USER_MSG,
    MOCK_ASSISTANT_MSG,
];
