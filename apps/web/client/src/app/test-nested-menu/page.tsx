'use client';

import { useState } from 'react';
import { AtMenu } from '@/app/project/[id]/_components/right-panel/chat-tab/at-menu';
import type { AtMenuItem, AtMenuState } from '@/components/store/editor/chat/at-menu/types';

export default function TestNestedMenu() {
  const [inputValue, setInputValue] = useState('');
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

  // Mock editor engine for testing with context functionality
  const mockEditorEngine = {
    chat: {
      context: {
        context: [] as any[],
        addMentionContext: (item: { name: string; path: string; icon: string; category: string }) => {
          const mentionContext = {
            type: 'mention',
            content: '',
            displayName: item.name,
            path: item.path,
            icon: item.icon,
            category: item.category,
          };
          mockEditorEngine.chat.context.context.push(mentionContext);
          console.log('Added mention context:', mentionContext);
          console.log('All contexts:', mockEditorEngine.chat.context.context);
        }
      }
    },
    ide: {
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
      ]
    }
  };

  const handleAtMenuSelect = (item: AtMenuItem) => {
    console.log('Selected item:', item);
    
    // Replace the last @ and any text after it with the selected item
    const lastAtIndex = inputValue.lastIndexOf('@');
    const textBeforeAt = inputValue.substring(0, lastAtIndex);
    const newValue = textBeforeAt + `@${item.name} `;
    setInputValue(newValue);
    
    // Add context pill for the selected item
    const mentionContext = mockEditorEngine.chat.context.addMentionContext({
      name: item.name,
      path: item.path,
      icon: item.icon || 'file',
      category: item.category
    });
    
    // Close @ menu and reset submenu state
    setAtMenuState(prev => ({
      ...prev,
      isOpen: false,
      activeMention: false,
      searchQuery: '',
      previewText: '',
      isSubmenuOpen: false,
      submenuParent: null,
      submenuItems: [],
      submenuSelectedIndex: 0
    }));
  };

  const handleAtMenuClose = () => {
    setAtMenuState(prev => ({
      ...prev,
      isOpen: false,
      activeMention: false,
      searchQuery: '',
      previewText: '',
      isSubmenuOpen: false,
      submenuParent: null,
      submenuItems: [],
      submenuSelectedIndex: 0
    }));
  };

  const handleAtMenuStateChange = (newState: Partial<AtMenuState>) => {
    setAtMenuState(prev => ({
      ...prev,
      ...newState
    }));
  };

  const getPlainText = (element: HTMLElement): string => {
    let text = '';
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      text += node.textContent;
    }
    
    return text;
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const plainText = getPlainText(element);
    setInputValue(plainText);
    
    // Check if user just typed a new "@" character
    const prevValue = inputValue;
    const newAtTyped = plainText.length > prevValue.length && plainText.endsWith('@');
    
    if (newAtTyped) {
      console.log('Opening @ menu - newAtTyped detected');
      // Open @ menu
      const rect = element.getBoundingClientRect();
      const inputPadding = 12; // p-3 = 12px padding
      
      // Calculate position for @ menu
      const atIndex = plainText.lastIndexOf('@');
      const textBeforeAt = plainText.substring(0, atIndex);
      
      // Create a temporary span to measure text width
      const span = document.createElement('span');
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.whiteSpace = 'pre';
      span.style.font = window.getComputedStyle(element).font;
      span.textContent = textBeforeAt;
      
      document.body.appendChild(span);
      const textWidth = span.offsetWidth;
      document.body.removeChild(span);
      
      const newState = {
        isOpen: true,
        position: {
          top: rect.top,
          left: rect.left + inputPadding + textWidth
        },
        selectedIndex: 0,
        searchQuery: '',
        activeMention: true
      };
      
      console.log('Setting @ menu state:', newState);
      setAtMenuState(prev => ({
        ...prev,
        ...newState
      }));
    } else if (atMenuState.activeMention && plainText.includes('@')) {
      // If we're in active mention mode and still have @, keep menu open
      const lastAtIndex = plainText.lastIndexOf('@');
      const textAfterAt = plainText.substring(lastAtIndex + 1);
      
      setAtMenuState(prev => ({
        ...prev,
        searchQuery: textAfterAt
      }));
    } else {
      // Close @ menu when @ is not present
      setAtMenuState(prev => ({
        ...prev,
        isOpen: false,
        activeMention: false,
        searchQuery: '',
        previewText: ''
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Nested @ Menu Test</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Instructions:</h2>
          <ul className="space-y-2 text-gray-300">
            <li>• Type "@" to open the main menu</li>
            <li>• Click on any folder item (with chevron) to open the nested submenu</li>
            <li>• Use the back button (←) to return to the main menu</li>
            <li>• Use arrow keys to navigate and Enter to select</li>
            <li>• Press Escape to close the menu</li>
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Input:</h2>
          <div
            contentEditable
            className="w-full h-32 p-4 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            onInput={handleInput}
            data-placeholder="Type @ to open the menu..."
          />
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Debug Info:</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-sm space-y-1">
              <div><strong>Input Value:</strong> {inputValue}</div>
              <div><strong>@ Menu Open:</strong> {atMenuState.isOpen ? 'Yes' : 'No'}</div>
              <div><strong>Submenu Open:</strong> {atMenuState.isSubmenuOpen ? 'Yes' : 'No'}</div>
              <div><strong>Submenu Parent:</strong> {atMenuState.submenuParent?.name || 'None'}</div>
              <div><strong>Submenu Items:</strong> {atMenuState.submenuItems.length}</div>
              <div><strong>Active Mention:</strong> {atMenuState.activeMention ? 'Yes' : 'No'}</div>
              <div><strong>Search Query:</strong> {atMenuState.searchQuery}</div>
              <div><strong>Context Count:</strong> {mockEditorEngine.chat.context.context.length}</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Selected Contexts:</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            {mockEditorEngine.chat.context.context.length === 0 ? (
              <div className="text-gray-400">No contexts selected</div>
            ) : (
              <div className="space-y-2">
                {mockEditorEngine.chat.context.context.map((context, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="bg-blue-600 px-2 py-1 rounded text-xs">
                      @{context.displayName}
                    </span>
                    <span className="text-gray-400 text-sm">{context.path}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <AtMenu
          state={atMenuState}
          onSelectItem={handleAtMenuSelect}
          onClose={handleAtMenuClose}
          onStateChange={handleAtMenuStateChange}
          editorEngine={mockEditorEngine}
        />
      </div>
    </div>
  );
} 