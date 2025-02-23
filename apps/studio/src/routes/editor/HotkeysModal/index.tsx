import { type ReactElement } from 'react';
import { Kbd } from '@onlook/ui/kbd';
import { Separator } from '@onlook/ui/separator';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion } from 'framer-motion';
import { Hotkey } from '../../../../common/hotkeys';
import { useEditorEngine } from '@/components/Context';
import { observer } from 'mobx-react-lite';

const HotkeysModal = observer(() => {
    const editorEngine = useEditorEngine();

    const categories = {
        Tools: [
            Hotkey.SELECT,
            Hotkey.PAN,
            Hotkey.INTERACT,
            Hotkey.INSERT_DIV,
            Hotkey.INSERT_TEXT,
        ],
        AI: [
            Hotkey.ADD_AI_CHAT,
            Hotkey.NEW_AI_CHAT,
        ],
        View: [
            Hotkey.ZOOM_FIT,
            Hotkey.ZOOM_IN,
            Hotkey.ZOOM_OUT,
        ],
        Edit: [
            Hotkey.UNDO,
            Hotkey.REDO,
            Hotkey.GROUP,
            Hotkey.UNGROUP,
            Hotkey.ENTER,
            Hotkey.COPY,
            Hotkey.PASTE,
            Hotkey.CUT,
            Hotkey.DUPLICATE,
            Hotkey.MOVE_LAYER_UP,
            Hotkey.MOVE_LAYER_DOWN,
        ],
        System: [
            Hotkey.ESCAPE,
            Hotkey.BACKSPACE,
            Hotkey.RELOAD_APP,
            Hotkey.OPEN_DEV_TOOL,
        ],
    };

    return (
        <AnimatePresence>
            {editorEngine.isHotkeysOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        onClick={() => (editorEngine.isHotkeysOpen = false)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-background border rounded-lg shadow-lg w-[800px] p-0 pointer-events-auto">
                            <div className="flex flex-col">
                                {/* Header */}
                                <div className="flex items-center p-6 pb-2">
                                    <h1 className="text-title3">Keyboard shortcuts</h1>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-auto"
                                        onClick={() => (editorEngine.isHotkeysOpen = false)}
                                    >
                                        <Icons.CrossS className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Separator />

                                {/* Content */}
                                <div className="p-6 pt-2">
                                    <div className="grid grid-cols-3 gap-10">
                                        {/* Modes Column */}
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-4">Actions</h3>
                                            <div className="space-y-3">
                                                {categories.Edit.map((hotkey) => (
                                                    <div key={hotkey.command} className="flex justify-between items-center">
                                                        <span className="text-sm text-popover-foreground">{hotkey.description}</span>
                                                        <div className="flex items-center gap-1">
                                                            {hotkey.readableCommand.split(' ').map((key) => (
                                                                <Kbd 
                                                                    key={`${hotkey.command}-${key}`} 
                                                                    className="h-6 px-2 text-[12px] bg-muted/50 text-popover-foreground border-border"
                                                                >
                                                                    {key}
                                                                </Kbd>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Middle Column - Zoom, Text, Copy */}
                                        <div className="space-y-8">
                                            {['View', 'System'].map((category) => (
                                                <div key={category}>
                                                    <h3 className="text-sm font-medium text-muted-foreground mb-4">{category}</h3>
                                                    <div className="space-y-3">
                                                        {categories[category as keyof typeof categories].map((hotkey) => (
                                                            <div key={hotkey.command} className="flex justify-between items-center">
                                                                <span className="text-sm text-popover-foreground">{hotkey.description}</span>
                                                                <div className="flex items-center gap-1">
                                                                    {hotkey.readableCommand.split(' ').map((key) => (
                                                                        <Kbd 
                                                                            key={`${hotkey.command}-${key}`} 
                                                                            className="h-6 px-2 text-[12px] bg-muted/50 text-popover-foreground border-border"
                                                                        >
                                                                            {key}
                                                                        </Kbd>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Right Column - Actions, Delete */}
                                        <div className="space-y-8">
                                            {['Tools', 'AI'].map((category) => (
                                                <div key={category}>
                                                    <h3 className="text-sm font-medium text-muted-foreground mb-4">{category}</h3>
                                                    <div className="space-y-3">
                                                        {categories[category as keyof typeof categories].map((hotkey) => (
                                                            <div key={hotkey.command} className="flex justify-between items-center">
                                                                <span className="text-sm text-popover-foreground">{hotkey.description}</span>
                                                                <div className="flex items-center gap-1">
                                                                    {hotkey.readableCommand.split(' ').map((key) => (
                                                                        <Kbd 
                                                                            key={`${hotkey.command}-${key}`} 
                                                                            className="h-6 px-2 text-[12px] bg-muted/50 text-popover-foreground border-border"
                                                                        >
                                                                            {key}
                                                                        </Kbd>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

export default HotkeysModal;
