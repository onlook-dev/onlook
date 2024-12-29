import { useEditorEngine } from '@/components/Context';
import { EditorMode, EditorTabValue } from '@/lib/models';
import { DefaultSettings } from '@onlook/models/constants';
import type { ReactNode } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import DeleteKey from './Delete';
import { Hotkey } from '/common/hotkeys';

interface HotkeysAreaProps {
    children: ReactNode;
    scale: number;
    setScale: (scale: number) => void;
    setPosition: (position: { x: number; y: number }) => void;
}

const HotkeysArea = ({ children, scale, setScale, setPosition }: HotkeysAreaProps) => {
    const editorEngine = useEditorEngine();

    // Zoom
    useHotkeys(
        'mod+0',
        () => {
            setScale(DefaultSettings.SCALE);
            setPosition({ x: DefaultSettings.POSITION.x, y: DefaultSettings.POSITION.y });
        },
        { preventDefault: true },
    );
    useHotkeys('mod+equal', () => setScale(scale * 1.2), { preventDefault: true });
    useHotkeys('mod+minus', () => setScale(scale * 0.8), { preventDefault: true });

    // Modes
    useHotkeys(Hotkey.SELECT.command, () => (editorEngine.mode = EditorMode.DESIGN));
    useHotkeys(Hotkey.ESCAPE.command, () => {
        editorEngine.mode = EditorMode.DESIGN;
        !editorEngine.text.isEditing && editorEngine.clear();
    });
    useHotkeys(Hotkey.PAN.command, () => (editorEngine.mode = EditorMode.PAN));
    useHotkeys(Hotkey.INTERACT.command, () => (editorEngine.mode = EditorMode.INTERACT));
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
    useHotkeys(Hotkey.DUPLICATE.command, () => editorEngine.copy.duplicate());

    // AI
    useHotkeys(Hotkey.ADD_AI_CHAT.command, () => (editorEngine.editPanelTab = EditorTabValue.CHAT));
    useHotkeys(Hotkey.NEW_AI_CHAT.command, () => {
        editorEngine.editPanelTab = EditorTabValue.CHAT;
        editorEngine.chat.conversation.startNewConversation();
    });

    // Move
    useHotkeys(
        Hotkey.MOVE_LAYER_UP.command,
        () => {
            const selected = editorEngine.elements.selected;
            if (selected.length === 1) {
                editorEngine.move.shiftElement(selected[0], 'up');
            }
        },
        { preventDefault: true },
    );
    useHotkeys(
        Hotkey.MOVE_LAYER_DOWN.command,
        () => {
            const selected = editorEngine.elements.selected;
            if (selected.length === 1) {
                editorEngine.move.shiftElement(selected[0], 'down');
            }
        },
        { preventDefault: true },
    );

    return (
        <>
            <DeleteKey />
            {children}
        </>
    );
};

export default HotkeysArea;
