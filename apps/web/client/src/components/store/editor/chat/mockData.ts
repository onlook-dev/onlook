import { assistant1, assistant2 } from '@onlook/ai/src/prompt/edit/example';
import { MessageContextType } from '@onlook/models/chat';
import { nanoid } from 'nanoid';
import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';

const GREETING_MSG_CONTENT =
    'Click on any element to chat with it. Try to be as detailed as possible for the best results!';

export const GREETING_MSG = new AssistantChatMessageImpl({
    id: nanoid(),
    role: 'assistant',
    content: GREETING_MSG_CONTENT,
    parts: [
        {
            type: 'text',
            text: GREETING_MSG_CONTENT,
        },
    ],
});

const MOCK_USER_MSG = new UserChatMessageImpl('Test message with some selected files', [
    {
        type: MessageContextType.FILE,
        path: 'app/page.tsx',
        content: 'export const Hello = 0;',
        displayName: 'page.tsx',
    },
    {
        type: MessageContextType.HIGHLIGHT,
        path: 'path/to/file',
        content: 'export const Hello = 0;',
        displayName: 'Component',
        start: 1,
        end: 10,
    },
    {
        type: MessageContextType.IMAGE,
        content: 'https://example.com/screenshot',
        mimeType: 'image/png',
        displayName: 'screenshot.png',
    },
]);

const MOCK_ASSISTANT_MSG_1 = new AssistantChatMessageImpl({
    id: nanoid(),
    role: 'assistant',
    content: assistant1,
    parts: [
        {
            type: 'text',
            text: assistant1,
        },
        {
            type: 'tool-invocation',
            toolInvocation: {
                state: 'result',
                toolName: 'listFiles',
                args: {
                    path: '/Users/kietho/workplace/onlook/test/test/app',
                },
                toolCallId: nanoid(),
                result: {
                    files: [
                        {
                            path: '/Users/kietho/workplace/onlook/test/test/app/page.tsx',
                        },
                    ],
                },
            },
        },
    ],
});

const MOCK_ASSISTANT_MSG_2 = new AssistantChatMessageImpl({
    id: nanoid(),
    role: 'assistant',
    content: assistant2,
    parts: [
        {
            type: 'text',
            text: assistant2,
        },
    ],
});

export const MOCK_STREAMING_ASSISTANT_MSG = new AssistantChatMessageImpl(MOCK_ASSISTANT_MSG_2);

export const MOCK_CHAT_MESSAGES = [
    GREETING_MSG,
    MOCK_USER_MSG,
    MOCK_ASSISTANT_MSG_1,
    MOCK_ASSISTANT_MSG_2,
];
