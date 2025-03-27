import type { ToolChatMessageImpl } from '@/lib/editor/engine/chat/message/tool';

export const ToolMessage = ({ message }: { message: ToolChatMessageImpl }) => {
    return <div>{JSON.stringify(message.content, null, 2)}</div>;
};
