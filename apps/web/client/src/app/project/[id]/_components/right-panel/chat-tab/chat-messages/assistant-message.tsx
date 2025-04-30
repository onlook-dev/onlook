import type { Message } from "ai";
import { MessageContent } from "./message-content";

export const AssistantMessage = ({ message }: { message: Message }) => {
    return (
        <div className="px-4 py-2 text-small content-start">
            <div className="flex flex-col text-wrap gap-2">
                <MessageContent
                    messageId={message.id}
                    parts={message.parts}
                    applied={false}
                    isStream={false}
                />
            </div>
        </div>
    );
};
