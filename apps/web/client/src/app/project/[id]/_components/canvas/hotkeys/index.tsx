import type { ReactNode } from 'react';
import { useEditorEngine } from '@/components/store/editor';
import { DefaultSettings } from '@onlook/constants';
import { EditorMode, EditorTabValue } from '@onlook/models';
import { useEffect, useRef } from 'react';
import { Hotkey } from '@/components/hotkey';

type KeyboardEventHandler = {
    [key: string]: (e: KeyboardEvent) => void;
};

export const HotkeysArea = ({ children }: { children: ReactNode }) => {
    const editorEngine = useEditorEngine();
    const keyIsDownRef = useRef<{ [key: string]: boolean }>({});

    const handleDisabledEventPropagation = (e: KeyboardEvent): void => {
        if (e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            } else if ((window as any).event) {
                (window as any).event.cancelBubble = true;
            }
        }
    };

    const getKeyIdentifier = (e: KeyboardEvent): string => {
        const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        const modKey = isMac ? e.metaKey : e.ctrlKey;
        
        let identifier = '';
        if (modKey) identifier += 'mod+';
        if (e.shiftKey) identifier += 'shift+';
        if (e.altKey && e.key !== 'Alt') identifier += 'alt+';;
        
        // Handle special keys
        switch (e.key) {
            case 'Escape': identifier += 'esc'; break;
            case 'Enter': identifier += 'enter'; break;
            case 'Backspace': identifier += 'backspace'; break;
            case 'Delete': identifier += 'delete'; break;
            case 'ArrowUp': identifier += 'arrowup'; break;
            case 'ArrowDown': identifier += 'arrowdown'; break;
            case '=': identifier += 'equal'; break;
            case '-': identifier += 'minus'; break;
            case ' ': identifier += 'space'; break;
            default: identifier += e.key.toLowerCase(); break;
        }
        
        return identifier;
    };

    const keyHandlers: KeyboardEventHandler = {
        // Zoom
        [Hotkey.ZOOM_FIT.command]: () => {
            editorEngine.canvas.scale = DefaultSettings.SCALE;
            editorEngine.canvas.position = {
                x: DefaultSettings.PAN_POSITION.x,
                y: DefaultSettings.PAN_POSITION.y,
            };
        },
        [Hotkey.ZOOM_IN.command]: () => {
            editorEngine.canvas.scale = editorEngine.canvas.scale * 1.2;
        },
        [Hotkey.ZOOM_OUT.command]: () => {
            editorEngine.canvas.scale = editorEngine.canvas.scale * 0.8;
        },

        // Modes
        [Hotkey.SELECT.command]: () => {
            editorEngine.state.editorMode = EditorMode.DESIGN;
        },
        [Hotkey.ESCAPE.command]: () => {
            editorEngine.state.editorMode = EditorMode.DESIGN;
            !editorEngine.text.isEditing && editorEngine.clearUI();
        },
        [Hotkey.PAN.command]: () => {
            editorEngine.state.editorMode = EditorMode.PAN;
        },
        [Hotkey.PREVIEW.command]: () => {
            editorEngine.state.editorMode = EditorMode.PREVIEW;
        },
        [Hotkey.INSERT_DIV.command]: () => {
            editorEngine.state.editorMode = EditorMode.INSERT_DIV;
        },
        [Hotkey.INSERT_TEXT.command]: () => {
            editorEngine.state.editorMode = EditorMode.INSERT_TEXT;
        },

        // Actions
        [Hotkey.UNDO.command]: () => editorEngine.action.undo(),
        [Hotkey.REDO.command]: () => editorEngine.action.redo(),
        [Hotkey.ENTER.command]: () => editorEngine.text.editSelectedElement(),
        [Hotkey.NEW_AI_CHAT.command]: () => {
            editorEngine.state.rightPanelTab = EditorTabValue.CHAT;
            editorEngine.chat.conversation.startNewConversation();
        },
        [Hotkey.BACKSPACE.command]: () => editorEngine.elements.delete(),
        [Hotkey.DELETE.command]: () => editorEngine.elements.delete(),

        // Group
        [Hotkey.GROUP.command]: () => editorEngine.group.groupSelectedElements(),
        [Hotkey.UNGROUP.command]: () => editorEngine.group.ungroupSelectedElement(),

        // Copy
        [Hotkey.COPY.command]: () => editorEngine.copy.copy(),
        [Hotkey.PASTE.command]: () => editorEngine.copy.paste(),
        [Hotkey.CUT.command]: () => editorEngine.copy.cut(),
        [Hotkey.DUPLICATE.command]: () => {
            if (editorEngine.frames.canDuplicate() && editorEngine.elements.selected.length === 0) {
                editorEngine.frames.duplicateSelected();
            } else {
                editorEngine.copy.duplicate();
            }
        },

        // AI
        [Hotkey.ADD_AI_CHAT.command]: () => {
            editorEngine.state.rightPanelTab = EditorTabValue.CHAT;
        },

        // Move
        [Hotkey.MOVE_LAYER_UP.command]: () => editorEngine.move.moveSelected('up'),
        [Hotkey.MOVE_LAYER_DOWN.command]: () => editorEngine.move.moveSelected('down'),

        // Show hotkeys
        [Hotkey.SHOW_HOTKEYS.command]: () => {
            editorEngine.state.hotkeysOpen = !editorEngine.state.hotkeysOpen;
        },
    };

    const keyUpHandlers: KeyboardEventHandler = {
        'space': () => {
            editorEngine.state.editorMode = EditorMode.DESIGN;
        },
        'alt': () => {
            editorEngine.overlay.removeMeasurement();
        },
    };

    const keyDownHandlers: KeyboardEventHandler = {
        'space': () => {
            editorEngine.state.editorMode = EditorMode.PAN;
        },
        'alt': () => {
            editorEngine.overlay.showMeasurement();
        },
    };

    const handleOverrideKeyboardEvent = (e: KeyboardEvent): boolean => {
        const keyIdentifier = getKeyIdentifier(e);
        
        switch (e.type) {
            case 'keydown':
                // Handle regular key combinations (execute every time)
                if (keyHandlers[keyIdentifier]) {
                    keyHandlers[keyIdentifier](e);
                }
                
                // Handle special keydown-only events (prevent repeats only for these)
                if (keyDownHandlers[keyIdentifier] && !keyIsDownRef.current[e.code]) {
                    keyIsDownRef.current[e.code] = true;
                    keyDownHandlers[keyIdentifier](e);
                }
                break;
            case 'keyup':
                // Clear individual key tracking
                delete keyIsDownRef.current[e.code];
                
                // Handle keyup events
                if (keyUpHandlers[keyIdentifier]) {
                    keyUpHandlers[keyIdentifier](e);
                }
                break;
        }
        
        handleDisabledEventPropagation(e);
        e.preventDefault();
        return false;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => handleOverrideKeyboardEvent(e);
        const handleKeyUp = (e: KeyboardEvent) => handleOverrideKeyboardEvent(e);

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);
    return <>{children}</>;
};
