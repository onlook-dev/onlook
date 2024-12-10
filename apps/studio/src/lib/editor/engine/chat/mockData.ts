import { FENCE } from '@onlook/ai/src/prompt/format';
import { MessageContextType } from '@onlook/models/chat';
import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';

export const GREETING_MSG = new AssistantChatMessageImpl(
    'Click on any element to chat with it. Try to be as detailed as possible for the best results!',
);

const MOCK_USER_MSG = new UserChatMessageImpl('Test message with some selected files', [
    {
        type: MessageContextType.FILE,
        path: '/Users/kietho/workplace/onlook/test/test/app/page.tsx',
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
        displayName: 'screenshot.png',
    },
]);

const MOCK_ASSISTANT_MSG = new AssistantChatMessageImpl(
    `Okay, let's update the code to make the copy more enticing. Here are the changes:
${FENCE.code.start}typescript
${FENCE.searchReplace.start}
export const World = 'Foo';
${FENCE.searchReplace.middle}
export const World = 'Foobar';
${FENCE.searchReplace.end}
${FENCE.code.end}
    `,
);

export const MOCK_STREAMING_ASSISTANT_MSG = MOCK_ASSISTANT_MSG;

export const MOCK_CHAT_MESSAGES = [GREETING_MSG, MOCK_USER_MSG, MOCK_ASSISTANT_MSG];
