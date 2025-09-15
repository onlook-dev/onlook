'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Terminal } from './terminal';

export const TerminalArea = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();
    const branches = editorEngine.branches;

    // Collect terminal sessions from all branches
    const allTerminalSessions = new Map<string, { name: string; branchName: string; branchId: string; sessionId: string; session: any }>();
    let activeSessionId: string | null = null;

    for (const branch of branches.allBranches) {
        try {
            const branchData = branches.getBranchById(branch.id);
            if (!branchData) continue;

            // Get the sandbox manager for this branch
            const sandbox = branches.getSandboxById(branch.id);
            if (!sandbox?.session?.terminalSessions) continue;

            for (const [sessionId, session] of sandbox.session.terminalSessions) {
                const key = `${branch.id}-${sessionId}`;
                allTerminalSessions.set(key, {
                    name: session.name,
                    branchName: branch.name,
                    branchId: branch.id,
                    sessionId: sessionId,
                    session: session
                });

                // Set active session if this is the currently active branch and session
                if (branch.id === branches.activeBranch.id && sessionId === sandbox.session.activeTerminalSessionId) {
                    activeSessionId = key;
                }
            }
        } catch (error) {
            // Skip branches that aren't properly initialized
            continue;
        }
    }

    const [terminalHidden, setTerminalHidden] = useState(true);
    const [restarting, setRestarting] = useState(false);
    const [hasConnectionTimeout, setHasConnectionTimeout] = useState(false);
    const connectionStartTimeRef = useRef<number | null>(null);

    // Track connection state and detect timeouts (actual 502 errors)
    useEffect(() => {
        const activeBranch = branches.activeBranch;
        if (!activeBranch) {
            setHasConnectionTimeout(false);
            connectionStartTimeRef.current = null;
            return;
        }

        const branchData = branches.getBranchDataById(activeBranch.id);
        const isConnecting = branchData?.sandbox?.session?.isConnecting || branchData?.sandbox?.isIndexing;
        const hasProvider = branchData?.sandbox?.session?.provider;

        // If we have a provider, connection is successful - clear any timeout
        if (hasProvider) {
            setHasConnectionTimeout(false);
            connectionStartTimeRef.current = null;
            return;
        }

        // If not connecting, clear the timeout tracking
        if (!isConnecting) {
            setHasConnectionTimeout(false);
            connectionStartTimeRef.current = null;
            return;
        }

        // Start tracking connection time if not already
        if (!connectionStartTimeRef.current) {
            connectionStartTimeRef.current = Date.now();
        }

        // Check if we've been connecting for too long (5 seconds - users see 502 quickly)
        const connectionDuration = Date.now() - connectionStartTimeRef.current;
        const TIMEOUT_MS = 5000; // 5 seconds - enough to avoid false positives but quick enough for 502s

        if (connectionDuration >= TIMEOUT_MS) {
            // This is a real timeout/502 - show amber
            setHasConnectionTimeout(true);
        } else {
            // Set up a timeout to check again
            const remainingTime = TIMEOUT_MS - connectionDuration;
            const timeoutId = setTimeout(() => {
                // Re-check if still connecting after timeout
                const stillConnecting = branches.getBranchDataById(activeBranch.id)?.sandbox?.session?.isConnecting || 
                                       branches.getBranchDataById(activeBranch.id)?.sandbox?.isIndexing;
                const stillNoProvider = !branches.getBranchDataById(activeBranch.id)?.sandbox?.session?.provider;
                
                if (stillConnecting && stillNoProvider) {
                    setHasConnectionTimeout(true);
                }
            }, remainingTime);

            return () => clearTimeout(timeoutId);
        }
    }, [branches, branches.activeBranch]);

    // Simple computed value - just check if we have a confirmed timeout
    const hasSandboxError = hasConnectionTimeout;

    // Extract restart logic into a reusable function to follow DRY principles
    const handleRestartSandbox = async () => {
        const activeBranch = branches.activeBranch;
        if (!activeBranch || restarting) return;

        setRestarting(true);
        setHasConnectionTimeout(false); // Clear timeout state on restart
        connectionStartTimeRef.current = null; // Reset connection tracking
        
        try {
            const sandbox = branches.getSandboxById(activeBranch.id);
            if (!sandbox?.session) {
                toast.error('Sandbox session not available');
                setRestarting(false);
                return;
            }

            const success = await sandbox.session.restartDevServer();
            if (success) {
                toast.success('Sandbox restarted successfully', {
                    icon: <Icons.Cube className="h-4 w-4" />,
                });
                
                // Wait 5 seconds before refreshing webviews to avoid 502 errors
                setTimeout(() => {
                    const frames = editorEngine.frames.getAll();
                    frames.forEach(frame => {
                        try {
                            editorEngine.frames.reloadView(frame.frame.id);
                        } catch (frameError) {
                            console.error('Failed to reload frame:', frame.frame.id, frameError);
                        }
                    });
                    setRestarting(false);
                }, 5000);
            } else {
                toast.error('Failed to restart sandbox');
                setRestarting(false);
            }
        } catch (error) {
            console.error('Error restarting sandbox:', error);
            toast.error('An error occurred while restarting the sandbox');
            setRestarting(false);
        }
    };

    return (
        <>
            {terminalHidden ? (
                <motion.div layout className="flex items-center gap-1">
                    {children}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleRestartSandbox}
                                disabled={!branches.activeBranch || restarting}
                                className={cn(
                                    "h-9 w-9 flex items-center justify-center rounded-md border border-transparent transition-colors",
                                    hasSandboxError
                                        ? "bg-amber-900 text-amber-200 hover:bg-amber-800 hover:text-amber-100"
                                        : restarting
                                        ? "text-foreground-tertiary bg-accent/30" // Keep visible during restart
                                        : branches.activeBranch
                                        ? "hover:text-foreground-hover text-foreground-tertiary hover:bg-accent/50"
                                        : "text-foreground-disabled cursor-not-allowed opacity-50"
                                )}
                            >
                                {restarting ? (
                                    <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Icons.RestartSandbox className={cn(
                                        "h-4 w-4",
                                        hasSandboxError && "text-amber-200"
                                    )} />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={5} hideArrow>Restart Sandbox</TooltipContent>
                    </Tooltip>
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
                                    onClick={handleRestartSandbox}
                                    disabled={!branches.activeBranch || restarting}
                                    className={cn(
                                        "h-9 w-9 flex items-center justify-center rounded-md border border-transparent transition-colors",
                                        hasSandboxError
                                            ? "bg-amber-900 text-amber-200 hover:bg-amber-800 hover:text-amber-100"
                                            : restarting
                                            ? "text-foreground-tertiary bg-accent/30" // Keep visible during restart
                                            : branches.activeBranch
                                            ? "hover:text-foreground-hover text-foreground-tertiary hover:bg-accent/50"
                                            : "text-foreground-disabled cursor-not-allowed opacity-50"
                                    )}
                                >
                                    {restarting ? (
                                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Icons.RestartSandbox className={cn(
                                            "h-4 w-4",
                                            hasSandboxError && "text-amber-200"
                                        )} />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={5} hideArrow>Restart Sandbox</TooltipContent>
                        </Tooltip>
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
                        // Extract branch and session from the combined key
                        const terminalData = allTerminalSessions.get(value);
                        if (terminalData) {
                            // Switch to the branch first
                            editorEngine.branches.switchToBranch(terminalData.branchId);
                            // Then set the active terminal session for that branch
                            const sandbox = branches.getSandboxById(terminalData.branchId);
                            if (sandbox) {
                                sandbox.session.activeTerminalSessionId = terminalData.sessionId;
                            }
                        }
                    }}
                        className="w-full h-full">
                        <TabsList className="w-full h-8 rounded-none border-b border-border overflow-x-auto justify-start">
                            {Array.from(allTerminalSessions).map(([key, terminalData]) => (
                                <TabsTrigger key={key} value={key} className="flex-1">
                                    <span className="truncate">
                                        {terminalData.name} • {terminalData.branchName}
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