import { useEditorEngine } from '@/components/Context';
import { EditorMode, EditorTabValue } from '@/lib/models';
import { DefaultSettings } from '@onlook/models/constants';
import type { ReactNode } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import DeleteKey from './Delete';
import { Hotkey } from '/common/hotkeys';

const HotkeysArea = ({ children }: { children: ReactNode }) => {
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
    useHotkeys(Hotkey.SELECT.command, () => (editorEngine.mode = EditorMode.DESIGN));
    useHotkeys(Hotkey.ESCAPE.command, () => {
        editorEngine.mode = EditorMode.DESIGN;
        !editorEngine.text.isEditing && editorEngine.clearUI();
    });
    useHotkeys(Hotkey.PAN.command, () => (editorEngine.mode = EditorMode.PAN));
    useHotkeys(Hotkey.PREVIEW.command, () => (editorEngine.mode = EditorMode.PREVIEW));
    useHotkeys(Hotkey.INSERT_DIV.command, () => (editorEngine.mode = EditorMode.INSERT_DIV));
    useHotkeys(Hotkey.INSERT_TEXT.command, () => (editorEngine.mode = EditorMode.INSERT_TEXT));

    useHotkeys('space', () => (editorEngine.mode = EditorMode.PAN), { keydown: true });
    useHotkeys('space', () => (editorEngine.mode = EditorMode.DESIGN), { keyup: true });

    useHotkeys('alt', () => editorEngine.elements.showMeasurement(), { keydown: true });
    useHotkeys('alt', () => editorEngine.overlay.removeMeasurement(), { keyup: true });

    // Actions
    useHotkeys(Hotkey.UNDO.command, () => editorEngine.action.undo());
    useHotkeys(Hotkey.REDO.command, () => editorEngine.action.redo());
    useHotkeys(Hotkey.ENTER.command, () => editorEngine.text.editSelectedElement());
    useHotkeys(Hotkey.REFRESH_LAYERS.command, () => editorEngine.refreshLayers());
    useHotkeys(Hotkey.OPEN_DEV_TOOL.command, () => editorEngine.inspect());

    // Group
    useHotkeys(Hotkey.GROUP.command, () => editorEngine.group.groupSelectedElements());
    useHotkeys(Hotkey.UNGROUP.command, () => editorEngine.group.ungroupSelectedElement());

    // Copy
    useHotkeys(Hotkey.COPY.command, () => editorEngine.copy.copy());
    useHotkeys(Hotkey.PASTE.command, () => editorEngine.copy.paste());
    useHotkeys(Hotkey.CUT.command, () => editorEngine.copy.cut());
    useHotkeys(Hotkey.DUPLICATE.command, () => {
        if (editorEngine.isWindowSelected) {
            editorEngine.duplicateWindow();
        } else {
            editorEngine.copy.duplicate();
        }
    });

    // AI
    useHotkeys(Hotkey.ADD_AI_CHAT.command, () => (editorEngine.editPanelTab = EditorTabValue.CHAT));
    useHotkeys(Hotkey.NEW_AI_CHAT.command, () => {
        editorEngine.editPanelTab = EditorTabValue.CHAT;
        editorEngine.chat.conversation.startNewConversation();
    });

    // Move
    useHotkeys(Hotkey.MOVE_LAYER_UP.command, () => editorEngine.move.moveSelected('up'));
    useHotkeys(Hotkey.MOVE_LAYER_DOWN.command, () => editorEngine.move.moveSelected('down'));

    useHotkeys(Hotkey.SHOW_HOTKEYS.command, () => {
        editorEngine.isHotkeysOpen = !editorEngine.isHotkeysOpen;
    });

    return (
        <>
            <DeleteKey />
            {children}
        </>
    );
};

export default HotkeysArea;
