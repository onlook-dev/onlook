'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useState } from 'react';
import { RestartSandboxButton } from './restart-sandbox-button';
import { Terminal } from './terminal';

export const TerminalArea = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();
    const branches = editorEngine.branches;
    const activeBranch = branches.activeBranch;

    // Only collect terminal sessions from the currently active branch
    const activeBranchTerminalSessions = new Map<string, { name: string; branchName: string; branchId: string; sessionId: string; session: any }>();
    let activeSessionId: string | null = null;

    if (activeBranch) {
        try {
            const branchData = branches.getBranchById(activeBranch.id);
            if (branchData) {
                // Get the sandbox manager for this branch
                const sandbox = branches.getSandboxById(activeBranch.id);
                if (sandbox?.session?.terminalSessions) {
                    for (const [sessionId, session] of sandbox.session.terminalSessions) {
                        const key = `${activeBranch.id}-${sessionId}`;
                        activeBranchTerminalSessions.set(key, {
                            name: session.name,
                            branchName: activeBranch.name,
                            branchId: activeBranch.id,
                            sessionId: sessionId,
                            session: session
                        });

                        // Set active session if this is the currently active session
                        if (sessionId === sandbox.session.activeTerminalSessionId) {
                            activeSessionId = key;
                        }
                    }
                }
            }
        } catch (error) {
            // Skip if branch isn't properly initialized
        }
    }

    const [terminalHidden, setTerminalHidden] = useState(true);

    return (
        <>
            {terminalHidden ? (
                <motion.div layout className="flex items-center gap-1">
                    {children}
                    <RestartSandboxButton />
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
                        className="text-small text-foreground-secondary ml-2 select-none flex items-center gap-1"
                    >
                        Terminal
                        {activeBranch && (
                            <>
                                <span className="ml-1">•</span>
                                <Icons.Branch className="h-4 w-4 ml-0.5" />
                                <span className="text-mini">{activeBranch.name}</span>
                            </>
                        )}
                    </motion.span>
                    <div className="flex items-center gap-1">
                        <motion.div layout>{/* <RunButton /> */}</motion.div>
                        <RestartSandboxButton />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setTerminalHidden(!terminalHidden)}
                                    className="h-9 w-9 flex items-center justify-center hover:text-foreground-primary text-foreground-tertiary hover:bg-accent/50 rounded-md border border-transparent"
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
                {!activeBranch ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <span className="text-sm">Select a branch to view the terminal</span>
                    </div>
                ) : activeBranchTerminalSessions.size > 0 ? (
                    <Tabs defaultValue={'cli'} value={activeSessionId || ''} onValueChange={(value) => {
                        // Extract branch and session from the combined key
                        const terminalData = activeBranchTerminalSessions.get(value);
                        if (terminalData) {
                            // Set the active terminal session for the current branch
                            const sandbox = branches.getSandboxById(terminalData.branchId);
                            if (sandbox) {
                                sandbox.session.activeTerminalSessionId = terminalData.sessionId;
                            }
                        }
                    }}
                        className="w-full h-full">
                        <TabsList className="w-full h-8 rounded-none border-b border-border overflow-x-auto justify-start">
                            {Array.from(activeBranchTerminalSessions).map(([key, terminalData]) => (
                                <TabsTrigger 
                                    key={key} 
                                    value={key} 
                                    className="flex-1 [&:not([data-state=active])]:hover:bg-accent/50 [&:not([data-state=active])]:hover:text-foreground-primary"
                                >
                                    <span className="truncate">
                                        {terminalData.name}
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <div className="w-full h-full overflow-auto">
                            {Array.from(activeBranchTerminalSessions).map(([key, terminalData]) => (
                                <TabsContent key={key} forceMount value={key} className="h-full" hidden={activeSessionId !== key}>
                                    <Terminal hidden={terminalHidden} terminalSessionId={terminalData.sessionId} branchId={terminalData.branchId} />
                                </TabsContent>
                            ))}
                        </div>
                    </Tabs>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <span className="text-sm">No terminal sessions available for this branch</span>
                    </div>
                )}
            </div >
        </>
    );
});