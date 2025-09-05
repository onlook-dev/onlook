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
    const branches = editorEngine.branches;

    // Collect terminal sessions from active branch only
    const allTerminalSessions = new Map<string, { name: string; branchName: string; branchId: string; sessionId: string; session: any }>();
    let activeSessionId: string | null = null;

    try {
        const activeBranch = branches.activeBranch;
        const branchData = branches.getBranchById(activeBranch.id);
        if (branchData) {
            // Get the sandbox manager for the active branch
            const sandbox = branches.getSandboxById(activeBranch.id);
            if (sandbox?.session?.terminalSessions) {
                for (const [sessionId, session] of sandbox.session.terminalSessions) {
                    const key = sessionId; // Use just sessionId since we're only showing active branch
                    allTerminalSessions.set(key, {
                        name: session.name,
                        branchName: activeBranch.name,
                        branchId: activeBranch.id,
                        sessionId: sessionId,
                        session: session
                    });

                    // Set active session if this is the active session
                    if (sessionId === sandbox.session.activeTerminalSessionId) {
                        activeSessionId = key;
                    }
                }
            }
        }
    } catch (error) {
        // Skip if active branch isn't properly initialized
    }

    const [terminalHidden, setTerminalHidden] = useState(true);

    return (
        <>
            {terminalHidden ? (
                <motion.div layout className="flex items-center gap-1">
                    {children}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setTerminalHidden(!terminalHidden)}
                                className="h-9 w-9 flex items-center justify-center hover:text-foreground-hover text-foreground-tertiary hover:bg-accent/50 rounded-md border border-transparent"
                            >
                                <Icons.Terminal />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={5} hideArrow>Toggle Terminal</TooltipContent>
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
                                    className="h-9 w-9 flex items-center justify-center hover:text-foreground-hover text-foreground-tertiary hover:bg-accent/50 rounded-md border border-transparent"
                                >
                                    <Icons.ChevronDown />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={5} hideArrow>Toggle Terminal</TooltipContent>
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
{allTerminalSessions.size > 0 ? (
                    <Tabs defaultValue={'cli'} value={activeSessionId || ''} onValueChange={(value) => {
                        // Set the active terminal session for the active branch
                        const terminalData = allTerminalSessions.get(value);
                        if (terminalData) {
                            const sandbox = branches.getSandboxById(terminalData.branchId);
                            if (sandbox) {
                                sandbox.session.activeTerminalSessionId = terminalData.sessionId;
                            }
                        }
                    }}
                        className="w-full h-full">
                        <TabsList className="w-full h-8 rounded-none border-b border-border">
                            {Array.from(allTerminalSessions).map(([key, terminalData]) => (
                                <TabsTrigger key={key} value={key} className="flex-1">
                                    <span className="truncate">
                                        {terminalData.name}
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <div className="w-full h-full overflow-auto">
                            {Array.from(allTerminalSessions).map(([key, terminalData]) => (
                                <TabsContent key={key} forceMount value={key} className="h-full" hidden={activeSessionId !== key}>
                                    <Terminal hidden={terminalHidden} terminalSessionId={terminalData.sessionId} branchId={terminalData.branchId} />
                                </TabsContent>
                            ))}
                        </div>
                    </Tabs>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <span className="text-sm">No terminal sessions available</span>
                    </div>
                )}
            </div >
        </>
    );
});