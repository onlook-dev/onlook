// import { useEditorEngine } from '@/components/Context';
import { Hotkey } from '@/components/hotkey';
import { useEditorEngine } from '@/components/store';
import { DefaultSettings } from '@onlook/models/constants';
import { EditorMode, EditorTabValue } from '@onlook/models/editor';
import type { ReactNode } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { DeleteKey } from './delete';

export const HotkeysArea = ({ children }: { children: ReactNode }) => {
    const editorEngine = useEditorEngine();

    // Zoom
    useHotkeys(
        'mod+0',
        () => {
            editorEngine.canvas.scale = DefaultSettings.SCALE;
            editorEngine.canvas.position = {
                x: DefaultSettings.PAN_POSITION.x,
                y: DefaultSettings.PAN_POSITION.y,
            };
        },
        { preventDefault: true },
    );
    useHotkeys('mod+equal', () => (editorEngine.canvas.scale = editorEngine.canvas.scale * 1.2), {
        preventDefault: true,
    });
    useHotkeys('mod+minus', () => (editorEngine.canvas.scale = editorEngine.canvas.scale * 0.8), {
        preventDefault: true,
    });

    // Modes
    useHotkeys(Hotkey.SELECT.command, () => (editorEngine.state.editorMode = EditorMode.DESIGN));
    useHotkeys(Hotkey.ESCAPE.command, () => {
        editorEngine.state.editorMode = EditorMode.DESIGN;
        !editorEngine.text.isEditing && editorEngine.clearUI();
    });
    useHotkeys(Hotkey.PAN.command, () => (editorEngine.state.editorMode = EditorMode.PAN));
    useHotkeys(Hotkey.PREVIEW.command, () => (editorEngine.state.editorMode = EditorMode.PREVIEW));
    useHotkeys(Hotkey.INSERT_DIV.command, () => (editorEngine.state.editorMode = EditorMode.INSERT_DIV));
    useHotkeys(Hotkey.INSERT_TEXT.command, () => (editorEngine.state.editorMode = EditorMode.INSERT_TEXT));
    useHotkeys('space', () => (editorEngine.state.editorMode = EditorMode.PAN), { keydown: true });
    useHotkeys('space', () => (editorEngine.state.editorMode = EditorMode.DESIGN), { keyup: true });
    useHotkeys('alt', () => (editorEngine.overlay.showMeasurement()), { keydown: true });
    useHotkeys('alt', () => (editorEngine.overlay.removeMeasurement()), { keyup: true });

    // Actions
    useHotkeys(Hotkey.UNDO.command, () => (editorEngine.action.undo()));
    useHotkeys(Hotkey.REDO.command, () => (editorEngine.action.redo()));
    useHotkeys(Hotkey.ENTER.command, () => (editorEngine.text.editSelectedElement()));
    useHotkeys(Hotkey.REFRESH_LAYERS.command, () => (editorEngine.refreshLayers()));
    useHotkeys(Hotkey.OPEN_DEV_TOOL.command, () => (editorEngine.inspect()));

    // Group
    useHotkeys(Hotkey.GROUP.command, () => (
        editorEngine.group.groupSelectedElements()
    ));
    useHotkeys(Hotkey.UNGROUP.command, () => (
        editorEngine.group.ungroupSelectedElement()
    ));

    // Copy
    useHotkeys(Hotkey.COPY.command, () => (editorEngine.copy.copy()));
    useHotkeys(Hotkey.PASTE.command, () => (editorEngine.copy.paste()));
    useHotkeys(Hotkey.CUT.command, () => (editorEngine.copy.cut()));
    useHotkeys(Hotkey.DUPLICATE.command, () => {
        if (editorEngine.window.isWindowSelected) {
            editorEngine.window.duplicateWindow();
        } else {
            editorEngine.copy.duplicate();
        }
    });

    // AI
    useHotkeys(Hotkey.ADD_AI_CHAT.command, () => (editorEngine.state.rightPanelTab = EditorTabValue.CHAT));
    useHotkeys(Hotkey.NEW_AI_CHAT.command, () => {
        editorEngine.state.rightPanelTab = EditorTabValue.CHAT;
        editorEngine.chat.conversation.startNewConversation();
    });

    // Move
    useHotkeys(Hotkey.MOVE_LAYER_UP.command, () => (editorEngine.move.moveSelected('up')));
    useHotkeys(Hotkey.MOVE_LAYER_DOWN.command, () => (editorEngine.move.moveSelected('down')));
    useHotkeys(Hotkey.SHOW_HOTKEYS.command, () => (editorEngine.state.hotkeysOpen = !editorEngine.state.hotkeysOpen));

    return (
        <>
            <DeleteKey />
            {children}
        </>
    );
};
