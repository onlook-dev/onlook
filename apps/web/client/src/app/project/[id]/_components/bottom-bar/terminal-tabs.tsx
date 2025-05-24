import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { Terminal } from './terminal';
import { TerminalTab } from './terminal-tab';

interface TerminalTabsProps {
    hidden?: boolean;
}

export const TerminalTabs = observer(({ hidden = false }: TerminalTabsProps) => {
    const editorEngine = useEditorEngine();
    const terminalManager = editorEngine.terminal;
    const sessions = terminalManager.activeSessions;
    const activeSessionId = terminalManager.activeSessionId;

    const handleCreateTerminal = useCallback(async () => {
        try {
            await terminalManager.createSession();
        } catch (error) {
            console.error('Failed to create terminal:', error);
        }
    }, [terminalManager]);

    const handleCloseTerminal = useCallback((sessionId: string) => {
        terminalManager.closeSession(sessionId);
    }, [terminalManager]);

    const handleTabChange = useCallback((sessionId: string) => {
        terminalManager.setActiveSession(sessionId);
    }, [terminalManager]);

    if (sessions.length === 0) {
        return (
            <div className={cn(
                'bg-background rounded-lg overflow-auto transition-all duration-300 flex items-center justify-center',
                hidden ? 'h-0 w-0 invisible' : 'h-[22rem] w-[37rem]',
            )}>
                <div className="flex flex-col items-center gap-2 text-foreground-secondary">
                    <Icons.Terminal className="h-8 w-8" />
                    <p className="text-sm">No terminal sessions</p>
                    <button
                        onClick={handleCreateTerminal}
                        className="text-sm text-foreground-hover hover:underline"
                    >
                        Create terminal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            'bg-background rounded-lg overflow-auto transition-all duration-300',
            hidden ? 'h-0 w-0 invisible' : 'h-[22rem] w-[37rem]',
        )}>
            <Tabs value={activeSessionId || undefined} onValueChange={handleTabChange}>
                <div className="flex items-center justify-between border-b border-border">
                    <TabsList className="h-9 p-0 bg-transparent">
                        {sessions.map((session) => (
                            <TabsTrigger key={session.id} value={session.id} asChild>
                                <div>
                                    <TerminalTab
                                        name={session.name}
                                        isActive={session.id === activeSessionId}
                                        isConnected={session.isConnected}
                                        onClick={() => handleTabChange(session.id)}
                                        onClose={() => handleCloseTerminal(session.id)}
                                    />
                                </div>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleCreateTerminal}
                                className="h-8 w-8 flex items-center justify-center hover:text-foreground-hover text-foreground-tertiary hover:bg-accent rounded m-1"
                            >
                                <Icons.Plus className="h-4 w-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>New Terminal</TooltipContent>
                    </Tooltip>
                </div>
                {sessions.map((session) => (
                    <TabsContent key={session.id} value={session.id} className="m-0 h-[calc(22rem-2.25rem)]">
                        <Terminal hidden={false} terminalId={session.id} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
});
