import { memo } from "react";
import { MessageContent } from "../message-content";
import type { UIMessage } from "ai";

export const StaticMessageContent = memo(({ 
    messageId, 
    parts 
}: { 
    messageId: string; 
    parts: UIMessage['parts']
}) => (
    <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
        <MessageContent
            messageId={messageId}
            parts={parts}
            applied={false}
            isStream={false}
        />
    </div>
));

StaticMessageContent.displayName = 'StaticMessageContent';