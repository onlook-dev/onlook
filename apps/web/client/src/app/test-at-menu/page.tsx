'use client';

import { useState } from 'react';
import { AtMenu } from '@/app/project/[id]/_components/right-panel/chat-tab/at-menu';
import type { AtMenuItem, AtMenuState } from '@/components/store/editor/chat/at-menu/types';
import { motion } from 'motion/react';

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

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Check if user just typed a new "@" character
    const newAtTyped = value.length > inputValue.length && value.endsWith('@');
    
    if (newAtTyped) {
      console.log('Test page: Opening @ menu - newAtTyped detected');
      // Open @ menu
      const input = e.target;
      const rect = input.getBoundingClientRect();
      const inputPadding = 12; // p-3 = 12px padding
      
      // Calculate position for @ menu
      const atIndex = value.lastIndexOf('@');
      const textBeforeAt = value.substring(0, atIndex);
      
      // Create a temporary span to measure text width
      const span = document.createElement('span');
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.whiteSpace = 'pre';
      span.style.font = window.getComputedStyle(input).font;
      span.textContent = textBeforeAt;
      
      document.body.appendChild(span);
      const textWidth = span.offsetWidth;
      document.body.removeChild(span);
      
      // Calculate cursor position within the textarea
      const cursorX = rect.left + inputPadding + textWidth;
      
      // Calculate the position of the current text line
      const lineHeight = parseInt(window.getComputedStyle(input).lineHeight) || 20;
      const lines = textBeforeAt.split('\n');
      const currentLine = lines.length - 1;
      const verticalOffset = currentLine * lineHeight;
      const currentLineTop = rect.top + inputPadding + verticalOffset;
      
      // Position menu so its bottom edge is just above the current text line
      const menuHeight = 400;
      const menuTop = currentLineTop - menuHeight - 2; // 2px gap above the text line
      
      const newState = {
        isOpen: true,
        position: {
          top: Math.max(10, menuTop), // Ensure it doesn't go off the top
          left: cursorX
        },
        selectedIndex: 0,
        searchQuery: '',
        activeMention: true
      };
      
      console.log('Test page: Setting @ menu state:', newState);
      setAtMenuState(prev => ({
        ...prev,
        ...newState
      }));
    } else if (atMenuState.activeMention && value.includes('@')) {
      // If we're in active mention mode and still have @, keep menu open
      const lastAtIndex = value.lastIndexOf('@');
      const textAfterAt = value.substring(lastAtIndex + 1);
      
      // Update menu position based on current cursor position
      const input = e.target;
      const rect = input.getBoundingClientRect();
      const inputPadding = 12;
      const cursorPosition = input.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPosition);
      const lastAtInCursor = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtInCursor !== -1) {
        const textAfterAtInCursor = textBeforeCursor.substring(lastAtInCursor + 1);
        
        // Create a temporary span to measure text width
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'pre';
        span.style.font = window.getComputedStyle(input).font;
        span.textContent = textBeforeCursor;
        
        document.body.appendChild(span);
        const textWidth = span.offsetWidth;
        document.body.removeChild(span);
        
        // Calculate cursor position
        const cursorX = rect.left + inputPadding + textWidth;
        const lineHeight = parseInt(window.getComputedStyle(input).lineHeight) || 20;
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length - 1;
        const verticalOffset = currentLine * lineHeight;
        const currentLineTop = rect.top + inputPadding + verticalOffset;
        
        // Position menu so its bottom edge is just above the current text line
        const menuHeight = 400;
        const menuTop = currentLineTop - menuHeight - 2;
        
        setAtMenuState(prev => ({
          ...prev,
          position: {
            top: Math.max(10, menuTop),
            left: cursorX
          },
          searchQuery: textAfterAtInCursor
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

  // Add cursor position tracking for better positioning
  const handleCursorPosition = (e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!atMenuState.isOpen) return;
    
    const input = e.target as HTMLTextAreaElement;
    const rect = input.getBoundingClientRect();
    const inputPadding = 12;
    
    // Get cursor position
    const cursorPosition = input.selectionStart;
    const textBeforeCursor = input.value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;
    
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    
    // Create a temporary span to measure text width
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.font = window.getComputedStyle(input).font;
    span.textContent = textBeforeCursor;
    
    document.body.appendChild(span);
    const textWidth = span.offsetWidth;
    document.body.removeChild(span);
    
    // Calculate cursor position
    const cursorX = rect.left + inputPadding + textWidth;
    const lineHeight = parseInt(window.getComputedStyle(input).lineHeight) || 20;
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length - 1;
    const verticalOffset = currentLine * lineHeight;
    const currentLineTop = rect.top + inputPadding + verticalOffset;
    
    // Position menu so its bottom edge is just above the current text line
    const menuHeight = 400;
    const menuTop = currentLineTop - menuHeight - 2;
    
    setAtMenuState(prev => ({
      ...prev,
      position: {
        top: Math.max(10, menuTop),
        left: cursorX
      },
      searchQuery: textAfterAt
    }));
  };

  const handleAtMenuSelect = (item: AtMenuItem) => {
    console.log('Selected item:', item);
    // Replace the @ mention with the selected item
    const lastAtIndex = inputValue.lastIndexOf('@');
    const textBeforeAt = inputValue.substring(0, lastAtIndex);
    const textAfterAt = inputValue.substring(lastAtIndex + 1);
    const newValue = textBeforeAt + item.name + textAfterAt;
    setInputValue(newValue);
    
    // Close the menu
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

  // Mock editor engine for testing
  const mockEditorEngine = {
    chat: {
      context: {
        context: []
      }
    },
    project: {
      files: {
        getAllFiles: () => [
          { id: '1', name: 'index.html', path: '/index.html', type: 'file' },
          { id: '2', name: 'styles.css', path: '/styles.css', type: 'file' },
          { id: '3', name: 'script.js', path: '/script.js', type: 'file' }
        ]
      }
    },
    ide: {
      files: [
        { id: '1', name: 'index.html', path: '/index.html', type: 'file' },
        { id: '2', name: 'styles.css', path: '/styles.css', type: 'file' },
        { id: '3', name: 'script.js', path: '/script.js', type: 'file' }
      ],
      openedFiles: [
        { id: '1', filename: 'index.html', path: '/index.html' },
        { id: '2', filename: 'styles.css', path: '/styles.css' }
      ]
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">@ Menu Positioning Test</h1>
      <p className="text-gray-600 mb-4">
        Type @ in the textarea below to test the menu positioning. The menu should appear as a modal with its bottom edge close to your cursor position.
      </p>
      
      <div className="border rounded-lg p-4 relative">
        <textarea
          className="w-full h-32 p-3 border rounded resize-none font-mono"
          placeholder="Type @ to test menu positioning... The menu will appear as a modal near your cursor."
          value={inputValue}
          onChange={handleInput}
          onMouseMove={handleCursorPosition}
          onKeyDown={handleCursorPosition}
        />
        
        {/* Visual cursor indicator when @ menu is open */}
        {atMenuState.isOpen && (
          <div 
            className="absolute w-2 h-4 bg-blue-500 opacity-50 pointer-events-none"
            style={{
              left: `${atMenuState.position.left - 8}px`,
              top: `${atMenuState.position.top + 400}px`, // Position at bottom of menu
              zIndex: 1000
            }}
          />
        )}
        
        {/* Text line indicator */}
        {atMenuState.isOpen && (
          <div 
            className="absolute w-full h-0.5 bg-green-500 opacity-70 pointer-events-none"
            style={{
              left: `${atMenuState.position.left - 150}px`, // Approximate textarea left position
              top: `${atMenuState.position.top + 402}px`, // 2px below menu bottom (text line position)
              width: `300px`,
              zIndex: 1001
            }}
          />
        )}
      </div>
      
      <AtMenu
        state={atMenuState}
        onSelectItem={handleAtMenuSelect}
        onClose={handleAtMenuClose}
        onStateChange={handleAtMenuStateChange}
        editorEngine={mockEditorEngine}
      />
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <pre className="text-sm">
          {JSON.stringify({
            isOpen: atMenuState.isOpen,
            position: atMenuState.position,
            searchQuery: atMenuState.searchQuery,
            inputValue
          }, null, 2)}
        </pre>
      </div>
      
      {/* Motion test */}
      <div className="mt-4 p-4 bg-blue-100 rounded">
        <h3 className="font-semibold mb-2">Motion Test:</h3>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-500 text-white rounded"
        >
          This is a motion test. If you can see this animated, motion is working.
        </motion.div>
      </div>
    </div>
  );
} 