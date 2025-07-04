import { cn } from '@onlook/ui/utils';
import { motion } from 'motion/react';
import { InputSeparator } from '../../editor-bar/separator';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useEditorEngine } from '@/components/store/editor';

export const WindowsToolbar = () => {
    const editorEngine = useEditorEngine();
    const selected = editorEngine.frames.selected;
    const frameData = selected[0];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
                'flex flex-col border-[0.5px] border-border p-1 px-1.5 bg-background rounded-xl backdrop-blur drop-shadow-xl z-50 overflow-hidden',
            )}
            transition={{
                type: 'spring',
                bounce: 0.1,
                duration: 0.4,
                stiffness: 200,
                damping: 25,
            }}
        >
            <div className="flex items-center justify-center gap-0.5 w-full overflow-hidden">
                <InputSeparator />
                <Button
                    variant="ghost"
                    size="icon"
                    className="flex items-center gap-1 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    onClick={() => editorEngine.frames.duplicate(frameData?.frame.id)}
                >
                    <Icons.Copy className="h-4 w-4 min-h-4 min-w-4" />
                </Button>
                {editorEngine.frames.canDelete() && (
                    <>
                        <InputSeparator />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="flex items-center gap-1 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                            disabled={!editorEngine.frames.canDelete()}
                            onClick={() => editorEngine.frames.delete(frameData?.frame.id)}
                        >
                            <Icons.Trash className="h-4 w-4 min-h-4 min-w-4" />
                        </Button>
                    </>
                )}
            </div>
        </motion.div>
    );
};
