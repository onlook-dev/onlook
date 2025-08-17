import { Hotkey } from '@/components/hotkey';
import { useEditorEngine } from '@/components/store/editor';
import { DefaultSettings } from '@onlook/constants';
import { EditorMode, EditorTabValue } from '@onlook/models';
import type { ReactNode } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

export const HotkeysArea = ({ children }: { children: ReactNode }) => {
    const editorEngine = useEditorEngine();

    // Zoom
    useHotkeys(
        Hotkey.ZOOM_FIT.command,
        () => {
            editorEngine.canvas.scale = DefaultSettings.SCALE;
            editorEngine.canvas.position = {
                x: DefaultSettings.PAN_POSITION.x,
                y: DefaultSettings.PAN_POSITION.y,
            };
        },
        { preventDefault: true },
    );
    useHotkeys(Hotkey.ZOOM_IN.command, () => (editorEngine.canvas.scale = editorEngine.canvas.scale * 1.2), {
        preventDefault: true,
    });
    useHotkeys(Hotkey.ZOOM_OUT.command, () => (editorEngine.canvas.scale = editorEngine.canvas.scale * 0.8), {
        preventDefault: true,
    });

    // Modes
    useHotkeys(Hotkey.SELECT.command, () => (editorEngine.state.editorMode = EditorMode.DESIGN));
    useHotkeys(Hotkey.ESCAPE.command, () => {
        editorEngine.state.editorMode = EditorMode.DESIGN;
        if (!editorEngine.text.isEditing) {
            editorEngine.clearUI();
        }
    });
    useHotkeys(Hotkey.PAN.command, () => (editorEngine.state.editorMode = EditorMode.PAN));
    useHotkeys(Hotkey.PREVIEW.command, () => (editorEngine.state.editorMode = EditorMode.PREVIEW));
    useHotkeys(
        Hotkey.INSERT_DIV.command,
        () => (editorEngine.state.editorMode = EditorMode.INSERT_DIV),
    );
    useHotkeys(
        Hotkey.INSERT_TEXT.command,
        () => (editorEngine.state.editorMode = EditorMode.INSERT_TEXT),
    );
    useHotkeys('space', () => (editorEngine.state.editorMode = EditorMode.PAN), { keydown: true });
    useHotkeys('space', () => (editorEngine.state.editorMode = EditorMode.DESIGN), { keyup: true });
    useHotkeys('alt', () => editorEngine.overlay.showMeasurement(), { keydown: true });
    useHotkeys('alt', () => editorEngine.overlay.removeMeasurement(), { keyup: true });

    // Actions
    useHotkeys(Hotkey.UNDO.command, () => editorEngine.action.undo(), {
        preventDefault: true,
    });
    useHotkeys(Hotkey.REDO.command, () => editorEngine.action.redo(), {
        preventDefault: true,
    });
    useHotkeys(Hotkey.ENTER.command, () => editorEngine.text.editSelectedElement(), { preventDefault: true });
    useHotkeys([Hotkey.BACKSPACE.command, Hotkey.DELETE.command], () => {
        if (editorEngine.elements.selected.length > 0) {
            editorEngine.elements.delete();
        }
        else if (editorEngine.frames.selected.length > 0 && editorEngine.frames.canDelete()) {
            editorEngine.frames.deleteSelected();
        }
    }, { preventDefault: true });

    // Group
    useHotkeys(Hotkey.GROUP.command, () => editorEngine.group.groupSelectedElements());
    useHotkeys(Hotkey.UNGROUP.command, () => editorEngine.group.ungroupSelectedElement());

    // Copy
    useHotkeys(Hotkey.COPY.command, () => editorEngine.copy.copy(), { preventDefault: true });
    useHotkeys(Hotkey.PASTE.command, () => editorEngine.copy.paste(), { preventDefault: true });
    useHotkeys(Hotkey.CUT.command, () => editorEngine.copy.cut(), { preventDefault: true });
    useHotkeys(Hotkey.DUPLICATE.command, () => {
        if (editorEngine.elements.selected.length > 0) {
            editorEngine.copy.duplicate();
        }
        else if (editorEngine.frames.selected.length > 0 && editorEngine.frames.canDuplicate()) {
            editorEngine.frames.duplicateSelected();
        }
    }, { preventDefault: true });

    // AI
    useHotkeys(
        Hotkey.ADD_AI_CHAT.command,
        () => (editorEngine.state.rightPanelTab = EditorTabValue.CHAT),
    );
    useHotkeys(Hotkey.NEW_AI_CHAT.command, () => {
        editorEngine.state.rightPanelTab = EditorTabValue.CHAT;
        editorEngine.chat.conversation.startNewConversation();
    });
    useHotkeys(
        Hotkey.CHAT_MODE_TOGGLE.command,
        () => {
            editorEngine.state.rightPanelTab = EditorTabValue.CHAT;
            // Trigger open chat mode menu
            window.dispatchEvent(new CustomEvent('open-chat-mode-menu'));
        },
        { preventDefault: true },
    );

    // Move
    useHotkeys(Hotkey.MOVE_LAYER_UP.command, () => editorEngine.move.moveSelected('up'));
    useHotkeys(Hotkey.MOVE_LAYER_DOWN.command, () => editorEngine.move.moveSelected('down'));
    useHotkeys(
        Hotkey.SHOW_HOTKEYS.command,
        () => (editorEngine.state.hotkeysOpen = !editorEngine.state.hotkeysOpen),
    );

    return (
        <>
            {children}
        </>
    );
};
