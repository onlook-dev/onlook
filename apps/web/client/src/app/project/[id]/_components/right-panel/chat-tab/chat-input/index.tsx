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
    const prevTypedTextRef = useRef<string>('');

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

    // Sync mentions with context pills - ensure pill removal happens whenever a mention is deleted
    useEffect(() => {
      const currentMentionNames = mentions.map((m) => m.name);
      const contextMentions = editorEngine.chat.context.context.filter(
        (ctx) => ctx.type === MessageContextType.MENTION,
      );

      // Remove context pills that no longer appear in the input
      contextMentions.forEach((contextMention) => {
        if (!currentMentionNames.includes(contextMention.displayName)) {
          // Double-check that the raw input really no longer contains the mention
          const escapedName = contextMention.displayName.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          );
          const mentionPattern = new RegExp(`@${escapedName}(?=\\s|$)`, 'g');
          if (!mentionPattern.test(inputValue)) {
            editorEngine.chat.context.removeMentionContext(
              contextMention.displayName,
            );
          }
        }
      });
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

    // Function to get plain text excluding mention chips (elements with data-mention)
    const getPlainTextExcludingMentions = (element: HTMLElement): string => {
        let text = '';
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
        );

        let node: Node | null;
        while ((node = walker.nextNode())) {
            const parentElement = (node as Text).parentElement;
            if (parentElement && parentElement.closest('[data-mention]')) {
                // Skip text inside mention chips
                continue;
            }
            text += node?.textContent ?? '';
        }
        return text;
    };

    // Function to get typed text (excluding mention chips) AND caret offset within that text
    const getTypedTextAndCaret = (element: HTMLElement): { typedText: string; caretOffset: number } => {
        const selection = window.getSelection();
        const hasSelection = !!selection && selection.rangeCount > 0;
        const endContainer = hasSelection ? selection!.getRangeAt(0).endContainer : null;
        const endOffset = hasSelection ? selection!.getRangeAt(0).endOffset : 0;

        let typedText = '';
        let caretOffset = 0;

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while ((node = walker.nextNode())) {
            const parentElement = (node as Text).parentElement;
            const isInMention = !!(parentElement && parentElement.closest('[data-mention]'));
            const nodeText = node.textContent ?? '';

            if (!isInMention) {
                // Append to typed text
                typedText += nodeText;
            }

            if (hasSelection && node === endContainer) {
                // We are at the caret node; add only the portion up to endOffset if not in mention
                if (!isInMention) {
                    caretOffset = typedText.length - nodeText.length + Math.min(endOffset, nodeText.length);
                } else {
                    // Caret inside a mention chip; treat as if it is at the current accumulated length
                    caretOffset = typedText.length;
                }
            }
        }

        if (!hasSelection) {
            caretOffset = typedText.length;
        }

        return { typedText, caretOffset };
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
                // After programmatic updates (e.g., after selecting a mention),
                // sync the prevTypedTextRef to the current typed text (excluding mention chips)
                const { typedText } = getTypedTextAndCaret(contentEditableRef.current);
                prevTypedTextRef.current = typedText;
            }
        }
    }, [inputValue]);

                // Handle @ menu item selection
        const handleAtMenuSelect = (
            item: AtMenuItem,
            options?: { insertMode?: 'replaceToken' | 'append' }
        ) => {
            console.log('Selected item:', item);
            const insertMode = options?.insertMode ?? 'replaceToken';

            // Normalize mention name: lowercase and replace spaces with hyphens
            const normalizeMentionName = (name: string): string => {
                return name.trim().toLowerCase().replace(/\s+/g, '-');
            };
            const normalizedName = normalizeMentionName(item.name);

            // Helper to get the caret (cursor) position as a plain-text offset inside the
            // content-editable element. If we cannot calculate it we fall back to the end
            // of the current input string.
            const getCaretOffset = (el: HTMLElement | null): number => {
                if (!el) return inputValue.length;
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) return inputValue.length;
                const range = sel.getRangeAt(0);
                const preRange = range.cloneRange();
                preRange.selectNodeContents(el);
                preRange.setEnd(range.endContainer, range.endOffset);
                return preRange.toString().length;
            };

            const caretOffset = getCaretOffset(contentEditableRef.current);
            // Always derive the base text from the live contentEditable to avoid losing
            // any existing @-mentions that may not yet be reflected in state.
            const liveText = contentEditableRef.current
                ? getPlainText(contentEditableRef.current)
                : inputValue;
            const beforeCaret = liveText.slice(0, caretOffset);
            const afterCaret = liveText.slice(caretOffset);

            const buildReplacement = (): string => {
                // Replace folder placeholder like "@brand/" if present
                const folderNavRegex = /@([^\/]+)\/$/;
                const folderMatch = beforeCaret.match(folderNavRegex);
                if (folderMatch && folderMatch[1]) {
                    const startIndex = beforeCaret.lastIndexOf(folderMatch[0]);
                    const prefix = startIndex >= 0 ? beforeCaret.slice(0, startIndex) : beforeCaret;
                    const needsLeadingSpace = prefix.length > 0 && !/\s$/.test(prefix);
                    return prefix + (needsLeadingSpace ? ' ' : '') + `@${normalizedName} `;
                }
                // Replace immediate token like "@bran"
                const placeholderRegex = /@[^\s]*$/;
                const placeholderMatch = beforeCaret.match(placeholderRegex);
                const prefix = placeholderMatch
                    ? beforeCaret.slice(0, beforeCaret.length - placeholderMatch[0].length)
                    : beforeCaret;
                const needsLeadingSpace = prefix.length > 0 && !/\s$/.test(prefix);
                return prefix + (needsLeadingSpace ? ' ' : '') + `@${normalizedName} `;
            };

            let newBeforeCaret: string;
            if (insertMode === 'append') {
                // In append mode, if the user is in the middle of typing an @token (e.g. "@bran")
                // or a folder placeholder (e.g. "@brand/"), we still replace that token instead of
                // leaving it behind. Otherwise, we truly append.
                const hasFolderPlaceholder = /@([^\/]+)\/$/.test(beforeCaret);
                const hasTokenPlaceholder = /@[^\s]*$/.test(beforeCaret);
                if (hasFolderPlaceholder || hasTokenPlaceholder) {
                    newBeforeCaret = buildReplacement();
                } else {
                    const needsLeadingSpace = beforeCaret.length > 0 && !/\s$/.test(beforeCaret);
                    newBeforeCaret = beforeCaret + (needsLeadingSpace ? ' ' : '') + `@${normalizedName} `;
                }
            } else {
                newBeforeCaret = buildReplacement();
            }

            const newValue = newBeforeCaret + afterCaret;
            setInputValue(newValue);
        
        // Add context pill for the selected item
        console.log('Adding mention context for:', item.name);
        const mentionContext = editorEngine.chat.context.addMentionContext({
            name: normalizedName,
            path: item.path,
            icon: item.icon || 'file',
            category: item.category
        });
        console.log('Added mention context:', mentionContext);
        console.log('Context pills after adding:', editorEngine.chat.context.context.length);
        
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
        const { typedText } = getTypedTextAndCaret(element);
        setInputValue(plainText);
        
        // Check if user just typed a new "@" character
        const newAtTyped = typedText.length > prevTypedTextRef.current.length && typedText.endsWith('@');
        
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
                activeMention: true,
                isSubmenuOpen: false,
                submenuParent: null,
                submenuItems: [],
                submenuSelectedIndex: 0
            };
            
            console.log('Setting @ menu state:', newState);
            setAtMenuState(prev => ({
                ...prev,
                ...newState
            }));
        } else if (atMenuState.activeMention && typedText.includes('@')) {
            // If we're in active mention mode and still have @, keep menu open
            const lastAtIndex = typedText.lastIndexOf('@');
            const textAfterAt = typedText.substring(lastAtIndex + 1);
            
            // Check if this is a folder navigation (ends with /)
            const folderMatch = textAfterAt.match(/^([^\/]+)\/$/);
            if (folderMatch && folderMatch[1]) {
                // This is a folder navigation, update search query to show child items
                setAtMenuState(prev => ({
                    ...prev,
                    searchQuery: textAfterAt,
                    isSubmenuOpen: false,
                    submenuParent: null,
                    submenuItems: [],
                    submenuSelectedIndex: 0
                }));
            } else {
                // Regular search
                setAtMenuState(prev => ({
                    ...prev,
                    searchQuery: textAfterAt,
                    isSubmenuOpen: false,
                    submenuParent: null,
                    submenuItems: [],
                    submenuSelectedIndex: 0
                }));
            }
        } else {
            // Close @ menu when @ is not present
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
        }

        // Update previous typed text reference
        prevTypedTextRef.current = typedText;
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // If user deletes the triggering "@" (Backspace/Delete), close the @ menu immediately
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const element = contentEditableRef.current;
            if (element) {
                const { typedText, caretOffset } = getTypedTextAndCaret(element);
                const atCount = (typedText.match(/@/g) || []).length;
                const deletingAt = e.key === 'Backspace'
                    ? caretOffset > 0 && typedText[caretOffset - 1] === '@'
                    : caretOffset < typedText.length && typedText[caretOffset] === '@';

                if (deletingAt && atCount <= 1) {
                    setAtMenuState(prev => ({
                        ...prev,
                        isOpen: false,
                        activeMention: false,
                        searchQuery: '',
                        previewText: '',
                        isSubmenuOpen: false,
                        submenuParent: null,
                        submenuItems: [],
                        submenuSelectedIndex: 0,
                    }));
                }
            }
        }
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

    // Handle click inside contenteditable to reopen @ menu when cursor is right after "@"
    const handleContentEditableClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) {
            return;
        }
        const element = e.currentTarget;
        // Obtain plain text of contenteditable
        const plainText = getPlainText(element);
        // Helper to compute caret offset relative to plain text
        const getCaretOffset = (el: HTMLElement | null): number => {
            if (!el) return plainText.length;
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return plainText.length;
            const range = sel.getRangeAt(0);
            const preRange = range.cloneRange();
            preRange.selectNodeContents(el);
            preRange.setEnd(range.endContainer, range.endOffset);
            return preRange.toString().length;
        };
        const caretOffset = getCaretOffset(element);

        if (caretOffset > 0 && plainText[caretOffset - 1] === '@') {
            const rect = element.getBoundingClientRect();
            const inputPadding = 12; // padding-left (p-3) as used when opening via typing
            const textBeforeCaret = plainText.substring(0, caretOffset);

            // Measure pixel width of textBeforeCaret to position menu correctly
            const span = document.createElement('span');
            span.style.visibility = 'hidden';
            span.style.position = 'absolute';
            span.style.whiteSpace = 'pre';
            span.style.font = window.getComputedStyle(element).font;
            span.textContent = textBeforeCaret;
            document.body.appendChild(span);
            const textWidth = span.offsetWidth;
            document.body.removeChild(span);

            setAtMenuState(prev => ({
                ...prev,
                isOpen: true,
                position: {
                    top: rect.top,
                    left: rect.left + inputPadding + textWidth,
                },
                selectedIndex: 0,
                searchQuery: '',
                activeMention: true,
                isSubmenuOpen: false,
                submenuParent: null,
                submenuItems: [],
                submenuSelectedIndex: 0,
            }));
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
                    onClick={handleContentEditableClick}
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
                        previewText: '',
                        isSubmenuOpen: false,
                        submenuParent: null,
                        submenuItems: [],
                        submenuSelectedIndex: 0
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
