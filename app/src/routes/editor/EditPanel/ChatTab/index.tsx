import { observer } from 'mobx-react-lite';
import { ChatInput } from './ChatInput';
import ChatPanel from './ChatMessages';

const ChatTab = observer(() => {
    return (
        <div className="w-full h-[calc(100vh-8.25rem)] flex flex-col justify-end">
            <div className="pb-4">
                <ChatPanel />
            </div>
            <ChatInput />
        </div>
    );
});

export default ChatTab;
