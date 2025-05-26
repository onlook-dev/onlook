import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { ErrorSection } from './error';

export const ChatTab = () => {
    return (
        <div className="flex flex-col h-full justify-end gap-2">
            <div className="h-full flex-1 overflow-y-auto">
                <ChatMessages />
            </div>
            <ErrorSection />
            <ChatInput />
        </div>
    );
};
