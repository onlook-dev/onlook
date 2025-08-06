'use client';

import { useState } from 'react';
import { AtMenu } from '@/app/project/[id]/_components/right-panel/chat-tab/at-menu';
import type { AtMenuItem, AtMenuState } from '@/components/store/editor/chat/at-menu/types';

export default function TestAtMenu() {
  const [inputValue, setInputValue] = useState('');
  const [atMenuState, setAtMenuState] = useState<AtMenuState>({
    isOpen: false,
    position: { top: 0, left: 0 },
    selectedIndex: 0,
    searchQuery: '',
    activeMention: false,
    previewText: ''
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
    },
    pages: {
      tree: [
        {
          id: 'page-1',
          name: 'Home',
          path: '/',
          children: []
        },
        {
          id: 'page-2',
          name: 'About',
          path: '/about',
          children: []
        },
        {
          id: 'page-3',
          name: 'Contact',
          path: '/contact',
          children: []
        },
        {
          id: 'page-4',
          name: 'Blog',
          path: '/blog',
          children: [
            {
              id: 'page-5',
              name: 'Post 1',
              path: '/blog/post-1',
              children: []
            }
          ]
        }
      ]
    }
  };

  // Function to get plain text from contenteditable
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

  // Function to render content with styled mentions
  const renderContentWithMentions = (text: string) => {
    if (!text) return '';
    
    const parts = text.split(/(@[a-zA-Z0-9._-]+)(?=\s|$)/g);
    return parts.map((part, index) => {
      if (part.match(/^@[a-zA-Z0-9._-]+$/)) {
        const name = part.substring(1);
        // Include the trailing space in the styled mention
        const nextPart = parts[index + 1] || '';
        const hasTrailingSpace = nextPart.startsWith(' ');
        const trailingSpace = hasTrailingSpace ? ' ' : '';
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-[#363B42] text-white mr-1" data-mention="${name}" contenteditable="false">@${name}${trailingSpace}</span>`;
      }
      return part;
    }).join('');
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
          top: rect.top, // Use the element's top position as reference
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
      
      // Check if this is a folder navigation (ends with /)
      const folderMatch = textAfterAt.match(/^([^\/]+)\/$/);
      if (folderMatch && folderMatch[1]) {
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

  const handleAtMenuSelect = (item: AtMenuItem) => {
    console.log('Selected item:', item);
    
    // Check if we're in folder navigation mode
    const folderMatch = inputValue.match(/@([^\/]+)\/$/);
    if (folderMatch && folderMatch[1]) {
      // We're in folder navigation, replace the entire folder mention with the selected file
      const folderName = folderMatch[1];
      const folderMention = `@${folderName}/`;
      const newValue = inputValue.replace(folderMention, `@${item.name} `);
      setInputValue(newValue);
    } else {
      // Regular mention selection
      // Replace the last @ and any text after it with the selected item
      const lastAtIndex = inputValue.lastIndexOf('@');
      const textBeforeAt = inputValue.substring(0, lastAtIndex);
      // Always add a space after the mention to ensure proper detection
      const newValue = textBeforeAt + `@${item.name} `;
      setInputValue(newValue);
    }
    
    // Add context pill for the selected item
    console.log('Adding mention context for:', item.name);
    const mentionContext = mockEditorEngine.chat.context.addMentionContext({
      name: item.name,
      path: item.path,
      icon: item.icon || 'file',
      category: item.category
    });
    console.log('Added mention context:', mentionContext);
    console.log('Context pills after adding:', mockEditorEngine.chat.context.context.length);
    
    // Close the menu
    setAtMenuState(prev => ({
      ...prev,
      isOpen: false,
      activeMention: false,
      searchQuery: '',
      previewText: ''
    }));
    
    // Focus back to input and position cursor after the space
    setTimeout(() => {
      const contentEditable = document.querySelector('[contenteditable]') as HTMLElement;
      if (contentEditable) {
        contentEditable.focus();
        
        // Find the last styled mention element and position cursor after it
        const mentionElements = contentEditable.querySelectorAll('[data-mention]');
        if (mentionElements.length > 0) {
          const lastMentionElement = mentionElements[mentionElements.length - 1];
          if (lastMentionElement) {
            const range = document.createRange();
            const selection = window.getSelection();
            // Position cursor after the last mention element (which includes the space)
            range.setStartAfter(lastMentionElement);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }
      }
    }, 10);
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
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">@ Menu Test</h1>
        
                  <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Test Instructions:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Type "@" in the input field below</li>
              <li>Select an item from the @ menu</li>
              <li>Verify that the selected item appears as a styled mention chip</li>
              <li>Check that context pills appear at the top and persist</li>
              <li>Try typing more text and adding more @ mentions</li>
              <li><strong>Persistence Test:</strong> Add a mention, then type text without spaces - context pill should persist</li>
              <li><strong>Space Test:</strong> Verify that a space is automatically added after each mention</li>
              <li><strong>Folder Navigation Test:</strong> Type "@src/" to see child files in the src folder</li>
              <li><strong>Folder Navigation Test:</strong> Type "@app/" to see child files in the app folder</li>
              <li><strong>Folder Navigation Test:</strong> Use arrow keys to navigate and Enter to select child files</li>
            </ol>
          </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Context Pills:</h2>
          <div className="flex flex-wrap gap-2 p-4 bg-gray-800 rounded-lg min-h-[60px]">
            {mockEditorEngine.chat.context.context.length === 0 ? (
              <span className="text-gray-500">No context pills yet. Add some @ mentions!</span>
            ) : (
              mockEditorEngine.chat.context.context.map((context, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono bg-[#363B42] text-white"
                >
                  @{context.displayName}
                  <button
                    onClick={() => {
                      mockEditorEngine.chat.context.context.splice(index, 1);
                      console.log('Removed context pill:', context);
                    }}
                    className="ml-2 text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Chat Input:</h2>
          <div className="border border-gray-600 rounded-lg p-4 bg-gray-800">
            <div
              contentEditable
              className="min-h-[100px] p-3 bg-transparent text-white outline-none focus:ring-2 focus:ring-blue-500 rounded"
              onInput={handleInput}
              dangerouslySetInnerHTML={{ __html: renderContentWithMentions(inputValue) }}
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Debug Info:</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-sm">
              <div><strong>Input Value:</strong> {inputValue}</div>
              <div><strong>@ Menu Open:</strong> {atMenuState.isOpen ? 'Yes' : 'No'}</div>
              <div><strong>Active Mention:</strong> {atMenuState.activeMention ? 'Yes' : 'No'}</div>
              <div><strong>Search Query:</strong> {atMenuState.searchQuery}</div>
              <div><strong>Context Count:</strong> {mockEditorEngine.chat.context.context.length}</div>
            </div>
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