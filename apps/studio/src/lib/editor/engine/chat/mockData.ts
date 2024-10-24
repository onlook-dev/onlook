import { AssistantChatMessageImpl } from './message/assistant';
import { SystemChatMessageImpl } from './message/system';
import { UserChatMessageImpl } from './message/user';

const MOCK_USER_MSG = new UserChatMessageImpl('Test message with some selected files', [
    {
        type: 'file',
        name: '/Users/kietho/workplace/onlook/test/test/app/page.tsx',
        value: 'export default function Page() {\n    return (\n        <div className="w-full min-h-screen flex items-center justify-center bg-white relative overflow-hidden">\n            <div className="text-center text-gray-900 p-8 relative z-10">\n                <h1 className="text-5xl font-bold mb-4 tracking-tight text-gray-800">\n                    Block Your App\'s Potential\n                </h1>\n                <p className="text-2xl text-gray-700 mb-8">\n                    Discover the power of our cutting-edge app and transform your business today.\n                </p>\n                <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-semibold">Get Started</button>\n            </div>\n        </div>\n    );\n}',
    },
    {
        type: 'selected',
        name: 'Component',
        value: 'export const Component = () => <div></div>',
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
                        value: 'export default function Page() {\n    return (\n        <div className="w-full min-h-screen flex items-center justify-center bg-red-400 relative overflow-hidden">\n            <div className="text-center text-gray-900 p-8 relative z-10">\n                <h1 className="text-5xl font-bold mb-4 tracking-tight text-gray-800">\n                    Unlock Your App\'s Potential\n                </h1>\n                <p className="text-2xl text-gray-700 mb-8">\n                    Discover the power of our cutting-edge app and transform your business today.\n                </p>\n                <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-semibold">Get Started</button>\n            </div>\n        </div>\n    );\n}',
                        description: 'Update the copy to make it more enticing',
                    },
                ],
            },
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
