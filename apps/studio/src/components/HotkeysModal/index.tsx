import { type ReactElement } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Kbd } from '@onlook/ui/kbd';
import { Hotkey } from '../../../common/hotkeys';

interface HotkeysModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function HotkeysModal({ open, onOpenChange }: HotkeysModalProps): ReactElement {
    const categories = {
        Modes: [
            Hotkey.SELECT,
            Hotkey.ESCAPE,
            Hotkey.PAN,
            Hotkey.INTERACT,
            Hotkey.INSERT_DIV,
            Hotkey.RELOAD_APP,
        ],
        Zoom: [Hotkey.ZOOM_FIT, Hotkey.ZOOM_IN, Hotkey.ZOOM_OUT],
        Actions: [
            Hotkey.UNDO,
            Hotkey.REDO,
            Hotkey.GROUP,
            Hotkey.UNGROUP,
            Hotkey.REFRESH_LAYERS,
            Hotkey.OPEN_DEV_TOOL,
            Hotkey.ADD_AI_CHAT,
            Hotkey.NEW_AI_CHAT,
            Hotkey.MOVE_LAYER_UP,
            Hotkey.MOVE_LAYER_DOWN,
        ],
        Text: [Hotkey.INSERT_TEXT, Hotkey.ENTER],
        Copy: [Hotkey.COPY, Hotkey.PASTE, Hotkey.CUT, Hotkey.DUPLICATE],
        Delete: [Hotkey.BACKSPACE, Hotkey.DELETE],
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {Object.entries(categories).map(([category, hotkeys]) => (
                        <div key={category}>
                            <h3 className="font-medium mb-2">{category}</h3>
                            <div className="space-y-2">
                                {hotkeys.map((hotkey) => (
                                    <div
                                        key={hotkey.command}
                                        className="flex justify-between items-center"
                                    >
                                        <span className="text-sm">{hotkey.description}</span>
                                        <div className="flex gap-1">
                                            {hotkey.readableCommand.split(' ').map((key) => (
                                                <Kbd key={`${hotkey.command}-${key}`}>{key}</Kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
