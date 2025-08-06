import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { FOCUS_CHAT_INPUT_EVENT } from '@/components/store/editor/chat';
import { transKeys } from '@/i18n/keys';
import { ChatType, EditorTabValue, type ImageMessageContext } from '@onlook/models';
import { MessageContextType } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { compressImageInBrowser } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { InputContextPills } from '../context-pills/input-context-pills';
import { Suggestions, type SuggestionsRef } from '../suggestions';
import { ActionButtons } from './action-buttons';
import { ChatModeToggle } from './chat-mode-toggle';
import { AtMenu } from '../at-menu';
import type { AtMenuItem, AtMenuState, Mention } from '@/components/store/editor/chat/at-menu/types';

// Styled mention chip component
const MentionChip = ({ name }: { name: string }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-[#363B42] text-white mr-1"
    contentEditable={false}
    data-mention={name}
  >
    @{name}
  </span>
);

export const ChatInput = observer(({
    inputValue,
    setInputValue,
    atMenuState,
    setAtMenuState,
}: {
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    atMenuState: AtMenuState;
    setAtMenuState: React.Dispatch<React.SetStateAction<AtMenuState>>;
}) => {
    const { sendMessages, stop, isWaiting } = useChatContext();
    const editorEngine = useEditorEngine();
    

    const t = useTranslations();
    const contentEditableRef = useRef<HTMLDivElement>(null);
    const suggestionRef = useRef<SuggestionsRef>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [actionTooltipOpen, setActionTooltipOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [chatMode, setChatMode] = useState<ChatType>(ChatType.EDIT);
    
    const [mentions, setMentions] = useState<Mention[]>([]);

    const focusInput = () => {
        requestAnimationFrame(() => {
            contentEditableRef.current?.focus();
        });
    };

    useEffect(() => {
        if (contentEditableRef.current && !isWaiting) {
            focusInput();
        }
    }, [editorEngine.chat.conversation.current?.messages]);

    useEffect(() => {
        if (editorEngine.state.rightPanelTab === EditorTabValue.CHAT) {
            focusInput();
        }
    }, [editorEngine.state.rightPanelTab]);

    useEffect(() => {
        const focusHandler = () => {
            if (contentEditableRef.current && !isWaiting) {
                focusInput();
            }
        };

        window.addEventListener(FOCUS_CHAT_INPUT_EVENT, focusHandler);
        return () => window.removeEventListener(FOCUS_CHAT_INPUT_EVENT, focusHandler);
    }, []);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && suggestionRef.current?.handleEnterSelection()) {
                e.preventDefault();
                e.stopPropagation();
                // Stop the event from bubbling to the canvas
                e.stopImmediatePropagation();
                // Handle the suggestion selection
                suggestionRef.current.handleEnterSelection();
            }
        };

        // Capture phase to intercept before it reaches the canvas
        window.addEventListener('keydown', handleGlobalKeyDown, true);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }, []);

    const disabled = isWaiting;
    const inputEmpty = !inputValue || inputValue.trim().length === 0;

    // Find mentions in text - improved regex to handle mentions at end of text
    const findMentions = (text: string): Mention[] => {
      const mentionRegex = /@([a-zA-Z0-9._-]+)(?=\s|$)/g;
      const foundMentions: Mention[] = [];
      let match;

      while ((match = mentionRegex.exec(text)) !== null) {
        if (match[1]) {
          foundMentions.push({
            id: `mention-${match.index}`,
            name: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      }

      return foundMentions;
    };

    // Update mentions whenever input value changes
    useEffect(() => {
      const newMentions = findMentions(inputValue);
      console.log('Found mentions:', newMentions);
      setMentions(newMentions);
    }, [inputValue]);

    // Sync mentions with context pills - only remove when mentions are explicitly deleted
    useEffect(() => {
      const currentMentionNames = mentions.map(m => m.name);
      const contextMentions = editorEngine.chat.context.context.filter(
        ctx => ctx.type === MessageContextType.MENTION
      );
      
      // Only remove context pills if the input has changed and mentions are missing
      // This prevents removal when the input is being processed or updated
      if (inputValue.length > 0) {
        contextMentions.forEach(contextMention => {
          if (!currentMentionNames.includes(contextMention.displayName)) {
            // Check if the mention was actually deleted (not just not detected)
            const mentionPattern = new RegExp(`@${contextMention.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'g');
            if (!mentionPattern.test(inputValue)) {
              console.log('Removing context pill for:', contextMention.displayName);
              // Remove the context pill since the mention was deleted from input
              editorEngine.chat.context.removeMentionContext(contextMention.displayName);
            }
          }
        });
      }
    }, [mentions, editorEngine.chat.context.context, inputValue]);

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

    // Function to update contenteditable with styled mentions
    const updateContentEditable = (text: string) => {
        if (contentEditableRef.current) {
            const html = renderContentWithMentions(text);
            contentEditableRef.current.innerHTML = html;
            
            // Set cursor to end
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(contentEditableRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    };

    // Update contenteditable when inputValue changes
    useEffect(() => {
        if (contentEditableRef.current) {
            const currentText = getPlainText(contentEditableRef.current);
            if (currentText !== inputValue) {
                console.log('Updating contenteditable with:', inputValue);
                updateContentEditable(inputValue);
            }
        }
    }, [inputValue]);

    // Handle @ menu item selection
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
        const mentionContext = editorEngine.chat.context.addMentionContext({
            name: item.name,
            path: item.path,
            icon: item.icon || 'file',
            category: item.category
        });
        console.log('Added mention context:', mentionContext);
        console.log('Context pills after adding:', editorEngine.chat.context.context.length);
        
        // Close @ menu
        setAtMenuState(prev => ({
            ...prev,
            isOpen: false,
            activeMention: false,
            searchQuery: '',
            previewText: ''
        }));
        
        // Focus back to input and set cursor position after the space
        setTimeout(() => {
            if (contentEditableRef.current) {
                contentEditableRef.current.focus();
                
                // Find the last styled mention element and position cursor after it
                const mentionElements = contentEditableRef.current.querySelectorAll('[data-mention]');
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
                } else {
                    // Fallback: position at end
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(contentEditableRef.current);
                    range.collapse(false);
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                }
            }
        }, 10); // Small delay to ensure contenteditable has updated
    };

    function handleInput(e: React.FormEvent<HTMLDivElement>) {
        if (isComposing) {
            return;
        }
        
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
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Handle @ menu keyboard navigation
        if (atMenuState.isOpen) {
            switch (e.key) {
                case 'ArrowDown':
                case 'ArrowUp':
                case 'Enter':
                case 'Escape':
                    e.preventDefault();
                    e.stopPropagation();
                    return;
            }
        }

        if (e.key === 'Tab') {
            // Always prevent default tab behavior
            e.preventDefault();
            e.stopPropagation();

            // Only let natural tab order continue if handleTabNavigation returns false
            const handled = suggestionRef.current?.handleTabNavigation(e.shiftKey);
            if (!handled) {
                // Focus the contenteditable
                contentEditableRef.current?.focus();
            }
        } else if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault();
            e.stopPropagation();

            if (suggestionRef.current?.handleEnterSelection()) {
                setTimeout(() => contentEditableRef.current?.focus(), 0);
                return;
            }

            if (!inputEmpty) {
                sendMessage();
            }
        }
    };

    async function sendMessage() {
        if (inputEmpty) {
            console.warn('Empty message');
            return;
        }
        if (isWaiting) {
            console.warn('Already waiting for response');
            return;
        }
        const savedInput = inputValue.trim();

        const streamMessages = chatMode === ChatType.ASK
            ? await editorEngine.chat.getAskMessages(savedInput)
            : await editorEngine.chat.getEditMessages(savedInput);

        if (!streamMessages) {
            toast.error('Failed to send message. Please try again.');
            setInputValue(savedInput);
            return;
        }

        await sendMessages(streamMessages, chatMode);
        setInputValue('');
    }

    const getPlaceholderText = () => {
        if (chatMode === ChatType.ASK) {
            return 'Ask a question about your project...';
        }
        return t(transKeys.editor.panels.edit.tabs.chat.input.placeholder);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const items = e.clipboardData.items;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) {
                    continue;
                }
                handleImageEvent(file, 'Pasted image');
                break;
            }
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.removeAttribute('data-dragging-image');

        const items = e.dataTransfer.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (!file) {
                    continue;
                }
                handleImageEvent(file, 'Dropped image');
                break;
            }
        }
    };

    const handleImageEvent = async (file: File, displayName?: string) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const compressedImage = await compressImageInBrowser(file);
            const base64URL = compressedImage || (event.target?.result as string);
            const contextImage: ImageMessageContext = {
                type: MessageContextType.IMAGE,
                content: base64URL,
                mimeType: file.type,
                displayName: displayName ?? file.name,
            };
            editorEngine.chat.context.context.push(contextImage);
        };
        reader.readAsDataURL(file);
    };

    const handleScreenshot = async () => {
        try {
            const framesWithViews = editorEngine.frames.getAll().filter(f => !!f.view);

            if (framesWithViews.length === 0) {
                toast.error('No active frame available for screenshot');
                return;
            }

            let screenshotData = null;
            let mimeType = 'image/jpeg';

            for (const frame of framesWithViews) {
                try {
                    if (!frame.view?.captureScreenshot) {
                        continue;
                    }

                    const result = await frame.view.captureScreenshot();
                    if (result && result.data) {
                        screenshotData = result.data;
                        mimeType = result.mimeType || 'image/jpeg';
                        break;
                    }
                } catch (frameError) {
                    // Continue to next frame on error
                }
            }

            if (!screenshotData) {
                toast.error('Failed to capture screenshot. Please refresh the page and try again.');
                return;
            }

            const contextImage: ImageMessageContext = {
                type: MessageContextType.IMAGE,
                content: screenshotData,
                mimeType: mimeType,
                displayName: 'Screenshot',
            };
            editorEngine.chat.context.context.push(contextImage);
            toast.success('Screenshot added to chat');
        } catch (error) {
            toast.error('Failed to capture screenshot. Please try again.');
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDragStateChange = (isDragging: boolean, e: React.DragEvent) => {
        const hasImage =
            e.dataTransfer.types.length > 0 &&
            Array.from(e.dataTransfer.items).some(
                (item) =>
                    item.type.startsWith('image/') ||
                    (item.type === 'Files' && e.dataTransfer.types.includes('public.file-url')),
            );
        if (hasImage) {
            setIsDragging(isDragging);
            e.currentTarget.setAttribute('data-dragging-image', isDragging.toString());
        }
    };

    const bubbleDragEvent = (e: React.DragEvent<HTMLDivElement>, eventType: string) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.parentElement?.dispatchEvent(
            new DragEvent(eventType, {
                bubbles: true,
                cancelable: true,
                dataTransfer: e.dataTransfer,
            }),
        );
    };

    return (
        <div
            className={cn(
                'flex flex-col w-full text-foreground-tertiary border-t text-small transition-colors duration-200 [&[data-dragging-image=true]]:bg-teal-500/40',
                isDragging && 'cursor-copy',
            )}
            onDrop={(e) => {
                handleDrop(e);
                setIsDragging(false);
            }}
            onDragOver={handleDragOver}
            onDragEnter={(e) => {
                e.preventDefault();
                handleDragStateChange(true, e);
            }}
            onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    handleDragStateChange(false, e);
                }
            }}
        >
            <Suggestions
                ref={suggestionRef}
                disabled={disabled}
                inputValue={inputValue}
                setInput={(suggestion) => {
                    setInputValue(suggestion);
                    contentEditableRef.current?.focus();
                    setTimeout(() => {
                        if (contentEditableRef.current) {
                            contentEditableRef.current.scrollTop = contentEditableRef.current.scrollHeight;
                        }
                    }, 100);
                }}
                onSuggestionFocus={(isFocused) => {
                    if (!isFocused) {
                        contentEditableRef.current?.focus();
                    }
                }}
            />
            <div className="flex flex-col w-full p-4">
                <InputContextPills />
                <div
                    ref={contentEditableRef}
                    contentEditable={!disabled}
                    className={cn(
                        'bg-transparent dark:bg-transparent mt-2 overflow-auto max-h-32 text-small p-0 border-0 focus-visible:ring-0 shadow-none rounded-none caret-[#FA003C] resize-none min-h-[72px] outline-none',
                        'selection:bg-[#FA003C]/30 selection:text-[#FA003C] text-foreground-primary placeholder:text-foreground-primary/50 cursor-text',
                        isDragging ? 'pointer-events-none' : 'pointer-events-auto',
                        !inputValue && 'before:content-[attr(data-placeholder)] before:text-foreground-primary/50 before:pointer-events-none',
                        disabled && 'pointer-events-none opacity-50'
                    )}
                    data-placeholder={getPlaceholderText()}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={(e) => {
                        setIsComposing(false);
                    }}
                    onDragEnter={(e) => {
                        bubbleDragEvent(e, 'dragenter');
                    }}
                    onDragOver={(e) => {
                        bubbleDragEvent(e, 'dragover');
                    }}
                    onDragLeave={(e) => {
                        bubbleDragEvent(e, 'dragleave');
                    }}
                    onDrop={(e) => {
                        bubbleDragEvent(e, 'drop');
                    }}
                />
            </div>
            <div className="flex flex-row w-full justify-between pt-2 pb-2 px-2">
                <div className="flex flex-row items-center gap-1.5">
                    <ChatModeToggle
                        chatMode={chatMode}
                        onChatModeChange={setChatMode}
                        disabled={disabled}
                    />
                </div>
                <div className="flex flex-row items-center gap-1.5">
                    <ActionButtons
                        disabled={disabled}
                        handleImageEvent={handleImageEvent}
                        handleScreenshot={handleScreenshot}
                    />
                    {isWaiting ? (
                        <Tooltip open={actionTooltipOpen} onOpenChange={setActionTooltipOpen}>
                            <TooltipTrigger asChild>
                                <Button
                                    size={'icon'}
                                    variant={'secondary'}
                                    className="text-smallPlus w-fit h-full py-0.5 px-2.5 text-primary"
                                    onClick={() => {
                                        setActionTooltipOpen(false);
                                        stop();
                                    }}
                                >
                                    <Icons.Stop />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{'Stop response'}</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Button
                            size={'icon'}
                            variant={'secondary'}
                            className="text-smallPlus w-fit h-full py-0.5 px-2.5 text-primary"
                            disabled={inputEmpty || disabled}
                            onClick={sendMessage}
                        >
                            <Icons.ArrowRight />
                        </Button>
                    )}
                </div>
            </div>
            <AtMenu
                state={atMenuState}
                onSelectItem={handleAtMenuSelect}
                onClose={() => {
                    setAtMenuState(prev => ({
                        ...prev,
                        isOpen: false,
                        activeMention: false,
                        searchQuery: '',
                        previewText: ''
                    }));
                }}
                onStateChange={(newState) => {
                    setAtMenuState(prev => ({
                        ...prev,
                        ...newState
                    }));
                }}
                editorEngine={editorEngine}
            />
        </div>
    );
});
