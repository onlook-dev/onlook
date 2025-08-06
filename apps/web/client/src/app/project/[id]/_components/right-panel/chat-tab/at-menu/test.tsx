import { useState } from 'react';
import { AtMenu } from './index';
import { RecentActivityTracker } from '@/components/store/editor/chat/at-menu/recent-activity';
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
      'package.json',
      'README.md',
      'src/index.ts',
      'src/components/Button.tsx',
      'src/components/Header.tsx',
      'src/app/page.tsx',
      'src/app/layout.tsx',
      'src/app/globals.css',
      'public/logo.png',
      'styles.css'
    ]
  },
  sandbox: {
    directories: [
      'src',
      'src/components',
      'src/app',
      'public',
      'public/assets',
      'docs'
    ],
    files: [
      'package.json',
      'README.md',
      'src/index.ts',
      'src/components/Button.tsx',
      'src/components/Header.tsx',
      'src/app/page.tsx',
      'src/app/layout.tsx',
      'src/app/globals.css',
      'public/logo.png',
      'styles.css'
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
      
      // Check if this is a folder navigation (ends with /)
      const folderMatch = /^([^\/]+)\/$/.exec(textAfterAt);
      if (folderMatch?.[1]) {
        // This is a folder navigation, update search query to show child items
        setAtMenuState(prev => ({
          ...prev,
          searchQuery: textAfterAt
        }));
      } else {
        // Regular search
        setAtMenuState(prev => ({
          ...prev,
          searchQuery: textAfterAt
        }));
      }
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
    // Check if we're in folder navigation mode
    const folderMatch = /@([^\/]+)\/$/.exec(inputValue);
    if (folderMatch?.[1]) {
      // We're in folder navigation, replace the entire folder mention with the selected file
      const folderName = folderMatch[1];
      const folderMention = `@${folderName}/`;
      const newValue = inputValue.replace(folderMention, `@${item.name} `);
      setInputValue(newValue);
    } else {
      // Regular mention selection
      const lastAtIndex = inputValue.lastIndexOf('@');
      const textBeforeAt = inputValue.substring(0, lastAtIndex);
      const newValue = textBeforeAt + `@${item.name} `;
      setInputValue(newValue);
    }
    
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

  const addTestActivity = () => {
    // Add some test activity
    RecentActivityTracker.addFileActivity('/src/app/page.tsx', 'page.tsx', 'code');
    RecentActivityTracker.addFileActivity('/src/app/layout.tsx', 'layout.tsx', 'code');
    RecentActivityTracker.addTabActivity('Layers', '/layers', 'layers');
    RecentActivityTracker.addTabActivity('Brand', '/brand', 'brand');
  };

  const clearActivity = () => {
    RecentActivityTracker.clear();
  };

  const testFolderNavigation = () => {
    // Simulate typing "@src/"
    setInputValue('@src/');
    setAtMenuState(prev => ({
      ...prev,
      isOpen: true,
      position: { top: 100, left: 100 },
      selectedIndex: 0,
      searchQuery: 'src/',
      activeMention: true
    }));
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">@ Menu Test</h2>
      
      <div className="mb-4 space-x-2">
        <button 
          onClick={addTestActivity}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Add Test Activity
        </button>
        <button 
          onClick={clearActivity}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm"
        >
          Clear Activity
        </button>
        <button 
          onClick={testFolderNavigation}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm"
        >
          Test Folder Navigation
        </button>
      </div>
      
      <textarea
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Type @ to open menu... Try typing '@src/' for folder navigation"
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
      
      <div className="mt-4">
        <h3 className="font-semibold">Instructions:</h3>
        <ul className="text-sm space-y-1">
          <li>• Type &quot;@&quot; to open the menu</li>
          <li>• Type &quot;@src/&quot; to see folder navigation</li>
          <li>• Type &quot;@app/&quot; to see child files in the app folder</li>
          <li>• Use arrow keys to navigate</li>
          <li>• Press Enter to select an item</li>
        </ul>
      </div>
    </div>
  );
}; 