import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Terminal } from './terminal';

export const TerminalArea = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();
    const terminalSessions = editorEngine.sandbox.session.terminalSessions;
    const activeSessionId = editorEngine.sandbox.session.activeTerminalSessionId;

    const [terminalHidden, setTerminalHidden] = useState(true);

    if (!terminalSessions.size) {
        return (
            <div className="flex items-center justify-center h-full p-1 gap-2">
                <Icons.Shadow className="animate-spin" />
                <p className="text-foreground-secondary">Initializing Sandbox...</p>
            </div>
        )
    }

    return (
        <>
            {terminalHidden ? (
                <motion.div layout className="flex items-center gap-1">
                    {children}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setTerminalHidden(!terminalHidden)}
                                className="h-9 w-9 flex items-center justify-center hover:text-foreground-hover text-foreground-tertiary hover:bg-accent rounded-md"
                            >
                                <Icons.Terminal />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>Toggle Terminal</TooltipContent>
                    </Tooltip>
                </motion.div>
            ) : (
                <motion.div
                    layout
                    className="flex items-center justify-between w-full mb-1"
                >
                    <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.7 }}
                        className="text-small text-foreground-secondary ml-2 select-none"
                    >
                        Terminal
                    </motion.span>
                    <div className="flex items-center gap-1">
                        <motion.div layout>{/* <RunButton /> */}</motion.div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setTerminalHidden(!terminalHidden)}
                                    className="h-9 w-9 flex items-center justify-center hover:text-foreground-hover text-foreground-tertiary hover:bg-accent rounded-lg"
                                >
                                    <Icons.ChevronDown />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Toggle Terminal</TooltipContent>
                        </Tooltip>
                    </div>
                </motion.div>
            )}
            <div
                className={cn(
                    'bg-background rounded-lg transition-all duration-300 flex flex-col items-center justify-between h-full overflow-auto',
                    terminalHidden ? 'h-0 w-0 invisible' : 'h-[22rem] w-[37rem]',
                )}
            >
                <Tabs defaultValue={'cli'} value={activeSessionId} onValueChange={(value) => editorEngine.sandbox.session.activeTerminalSessionId = value}
                    className="w-full h-full">
                    <TabsList className="w-full h-8 rounded-none border-b border-border">
                        {Array.from(terminalSessions).map(([id, terminal]) => (
                            <TabsTrigger key={id} value={id} className="flex-1">{terminal.name}</TabsTrigger>
                        ))}
                    </TabsList>
                    <div className="w-full h-full overflow-auto">
                        {Array.from(terminalSessions).map(([id]) => (
                            <TabsContent key={id} forceMount value={id} className="h-full" hidden={activeSessionId !== id}>
                                <Terminal hidden={terminalHidden} terminalSessionId={id} />
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </div >
        </>
    );
});