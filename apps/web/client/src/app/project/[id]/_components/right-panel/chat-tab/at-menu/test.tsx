import { useState } from 'react';
import { AtMenu } from './index';
import type { AtMenuItem, AtMenuState } from '@/components/store/editor/chat/at-menu/types';

// Mock editor engine for testing
const mockEditorEngine = {
  ide: {
    openedFiles: [
      { filename: 'page.tsx', path: '/src/app' },
      { filename: 'layout.tsx', path: '/src/app' },
      { filename: 'globals.css', path: '/src/app' }
    ],
    files: [
      {
        name: 'src',
        type: 'directory',
        children: [
          {
            name: 'app',
            type: 'directory',
            children: [
              { name: 'page.tsx', type: 'file' },
              { name: 'layout.tsx', type: 'file' }
            ]
          }
        ]
      }
    ]
  }
};

export const AtMenuTest = () => {
  const [inputValue, setInputValue] = useState('');
  const [atMenuState, setAtMenuState] = useState<AtMenuState>({
    isOpen: false,
    position: { top: 0, left: 0 },
    selectedIndex: 0,
    searchQuery: '',
    activeMention: false,
    previewText: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check if user typed "@"
    if (value.endsWith('@')) {
      setAtMenuState(prev => ({
        ...prev,
        isOpen: true,
        position: { top: 100, left: 100 },
        selectedIndex: 0,
        searchQuery: '',
        activeMention: true
      }));
    } else if (atMenuState.activeMention && value.includes('@')) {
      const lastAtIndex = value.lastIndexOf('@');
      const textAfterAt = value.substring(lastAtIndex + 1);
      setAtMenuState(prev => ({
        ...prev,
        searchQuery: textAfterAt
      }));
    } else {
      setAtMenuState(prev => ({
        ...prev,
        isOpen: false,
        activeMention: false,
        searchQuery: '',
        previewText: ''
      }));
    }
  };

  const handleSelectItem = (item: AtMenuItem) => {
    const lastAtIndex = inputValue.lastIndexOf('@');
    const textBeforeAt = inputValue.substring(0, lastAtIndex);
    const newValue = textBeforeAt + `@${item.name} `;
    setInputValue(newValue);
    
    setAtMenuState(prev => ({
      ...prev,
      isOpen: false,
      activeMention: false,
      searchQuery: '',
      previewText: ''
    }));
  };

  const handleClose = () => {
    setAtMenuState(prev => ({
      ...prev,
      isOpen: false,
      activeMention: false,
      searchQuery: '',
      previewText: ''
    }));
  };

  const handleStateChange = (newState: Partial<AtMenuState>) => {
    setAtMenuState(prev => ({
      ...prev,
      ...newState
    }));
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">@ Menu Test</h2>
      <textarea
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Type @ to open menu..."
        className="w-full h-32 p-2 border rounded"
      />
      
      <AtMenu
        state={atMenuState}
        onSelectItem={handleSelectItem}
        onClose={handleClose}
        onStateChange={handleStateChange}
        editorEngine={mockEditorEngine}
      />
      
      <div className="mt-4">
        <h3 className="font-semibold">Current State:</h3>
        <pre className="text-sm bg-gray-100 p-2 rounded">
          {JSON.stringify(atMenuState, null, 2)}
        </pre>
      </div>
    </div>
  );
}; 