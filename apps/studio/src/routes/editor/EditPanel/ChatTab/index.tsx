import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { ErrorView } from './ErrorView';

export const ChatTab = () => {
    return (
        <div className="w-full h-[calc(100vh-8.25rem)] flex flex-col justify-end gap-2">
            <ChatMessages />
            <ErrorView />
            <ChatInput />
        </div>
    );
};
