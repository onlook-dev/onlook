import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { ErrorSection } from './error';
import { useEditorEngine } from '@/components/store/editor';
import { useState } from 'react';
import type { AtMenuState } from '@/components/store/editor/chat/at-menu/types';

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
      previewText: '',
      isSubmenuOpen: false,
      submenuParent: null,
      submenuItems: [],
      submenuSelectedIndex: 0
    });

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
        </div>
    );
};
