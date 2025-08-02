import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { ErrorSection } from './error';
import { AtMenu } from './at-menu';
import { useEditorEngine } from '@/components/store/editor';
import { useState } from 'react';
import type { AtMenuItem, AtMenuState } from '@/components/store/editor/chat/at-menu/types';

export const ChatTab = ({
    inputValue,
    setInputValue,
}: {
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
}) => {
    const editorEngine = useEditorEngine();
    
    // @ Menu state - moved from ChatInput
    const [atMenuState, setAtMenuState] = useState<AtMenuState>({
      isOpen: false,
      position: { top: 0, left: 0 },
      selectedIndex: 0,
      searchQuery: '',
      activeMention: false,
      previewText: ''
    });

    const handleAtMenuSelect = (item: AtMenuItem) => {
        // Replace the last @ and any text after it with the selected item
        const lastAtIndex = inputValue.lastIndexOf('@');
        const textBeforeAt = inputValue.substring(0, lastAtIndex);
        const newValue = textBeforeAt + `@${item.name} `;
        setInputValue(newValue);
        
        // Close @ menu
        setAtMenuState(prev => ({
            ...prev,
            isOpen: false,
            activeMention: false,
            searchQuery: '',
            previewText: ''
        }));
    };

    const handleAtMenuClose = () => {
        setAtMenuState(prev => ({
            ...prev,
            isOpen: false,
            activeMention: false,
            searchQuery: '',
            previewText: ''
        }));
    };

    const handleAtMenuStateChange = (newState: Partial<AtMenuState>) => {
        setAtMenuState(prev => ({
            ...prev,
            ...newState
        }));
    };

    return (
        <div className="flex flex-col h-full justify-end gap-2 pt-2">
            <div className="h-full flex-1 overflow-y-auto">
                <ChatMessages />
            </div>
            <ErrorSection />
            <ChatInput 
                inputValue={inputValue} 
                setInputValue={setInputValue}
                atMenuState={atMenuState}
                setAtMenuState={setAtMenuState}
            />
            <AtMenu
                state={atMenuState}
                onSelectItem={handleAtMenuSelect}
                onClose={handleAtMenuClose}
                onStateChange={handleAtMenuStateChange}
                editorEngine={editorEngine}
            />
        </div>
    );
};
