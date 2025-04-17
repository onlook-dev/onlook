import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { Error } from './error';

export const ChatTab = () => {
    return (
        <div className="w-full h-[calc(100vh-8.25rem)] flex flex-col justify-end gap-2">
            <ChatMessages />
            <Error />
            <ChatInput />
        </div>
    );
};
