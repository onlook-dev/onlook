import { EditorMode } from '@/lib/models';
import { ReactNode } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useEditorEngine } from '..';
import { Hotkey } from '/common/hotkeys';

interface HotkeysAreaProps {
    children: ReactNode;
    scale: number;
    setScale: React.Dispatch<React.SetStateAction<number>>;
    DEFAULT_SCALE: number;
}
const HotkeysArea = ({ children, scale, setScale, DEFAULT_SCALE }: HotkeysAreaProps) => {
    const editorEngine = useEditorEngine();

    // Zoom
    useHotkeys('meta+0', () => setScale(DEFAULT_SCALE), { preventDefault: true });
    useHotkeys('meta+equal', () => setScale(scale * 1.2), { preventDefault: true });
    useHotkeys('meta+minus', () => setScale(scale * 0.8), { preventDefault: true });

    // Modes
    useHotkeys(Hotkey.SELECT.command, () => (editorEngine.mode = EditorMode.DESIGN));
    useHotkeys(Hotkey.ESCAPE.command, () => (editorEngine.mode = EditorMode.DESIGN));
    useHotkeys(Hotkey.PAN.command, () => (editorEngine.mode = EditorMode.PAN));
    useHotkeys(Hotkey.INTERACT.command, () => (editorEngine.mode = EditorMode.INTERACT));
    useHotkeys(Hotkey.INSERT_DIV.command, () => (editorEngine.mode = EditorMode.INSERT_DIV));
    // useHotkeys(Hotkeys.INSERT_TEXT.command, () => (editorEngine.mode = EditorMode.INSERT_TEXT));
    useHotkeys('space', () => (editorEngine.mode = EditorMode.PAN), { keydown: true });
    useHotkeys('space', () => (editorEngine.mode = EditorMode.DESIGN), { keyup: true });
    useHotkeys('meta+alt', () =>
        editorEngine.mode === EditorMode.INTERACT
            ? (editorEngine.mode = EditorMode.DESIGN)
            : (editorEngine.mode = EditorMode.INTERACT),
    );

    // Actions
    useHotkeys(Hotkey.UNDO.command, () => editorEngine.action.undo());
    useHotkeys(Hotkey.REDO.command, () => editorEngine.action.redo());

    return <>{children}</>;
};

export default HotkeysArea;
