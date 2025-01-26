import { observer } from 'mobx-react-lite';
import { ChatInput } from './ChatInput';
import ChatMessages from './ChatMessages';

const ChatTab = observer(() => {
    return (
        <div className="w-full h-[calc(100vh-8.25rem)] flex flex-col justify-end">
            <ChatMessages />
            <ChatInput />
        </div>
    );
});

export default ChatTab;
