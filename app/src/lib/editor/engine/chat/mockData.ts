import { AssistantChatMessageImpl } from './message/assistant';
import { SystemChatMessageImpl } from './message/system';
import { UserChatMessageImpl } from './message/user';

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
    '1',
    [
        {
            type: 'text',
            text: "Okay, let's update the code to make the copy more enticing. Here are the changes:",
        },
        {
            type: 'tool_use',
            id: 'toolu_01VJAPZXhvqyJtWnrWTaViy1',
            name: 'generate_code',
            input: {
                changes: [
                    {
                        fileName: '/Users/kietho/workplace/onlook/test/test/app/page.tsx',
                        value: 'export const World = 0;',
                        description: 'Update the copy to make it more enticing',
                        streaming: false,
                        applied: true,
                    },
                ],
            },
        },
    ],
    MOCK_USER_MSG.context,
);

export const MOCK_STREAMING_ASSISTANT_MSG = new AssistantChatMessageImpl(
    '2',
    [
        {
            type: 'text',
            text: 'I am currently talking...',
        },
        {
            type: 'tool_use',
            id: 'toolu_01VJAPZXhvqyJtWnrWTaViy1',
            name: 'generate_code',
            input: '',
        },
    ],
    MOCK_USER_MSG.context,
);

const MOCK_SYSTEM_MSG = new SystemChatMessageImpl([
    {
        type: 'tool_result',
        tool_use_id: 'toolu_01VJAPZXhvqyJtWnrWTaViy1',
        content: 'applied',
    },
]);

export const MOCK_CHAT_MESSAGES = [
    new AssistantChatMessageImpl('0', [
        {
            type: 'text',
            text: 'Hello! How can I assist you today?',
        },
    ]),
    MOCK_USER_MSG,
    MOCK_ASSISTANT_MSG,
    MOCK_SYSTEM_MSG,
];
