import { useProjectsManager } from '@/components/Context';
import { cn } from '@onlook/ui/utils';
import '@xterm/xterm/css/xterm.css';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';

interface TerminalProps {
    hidden?: boolean;
}

const Terminal = observer(({ hidden = false }: TerminalProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const projectManager = useProjectsManager();
    const runManager = projectManager.getActiveRunManager();

    useEffect(() => {
        if (!terminalRef.current || !runManager) {
            return;
        }

        // Initialize terminal
        runManager.initializeTerminal(terminalRef.current);

        // Handle resize
        const handleResize = () => {
            if (!hidden && runManager.term) {
                const { cols, rows } = runManager.term;
                runManager.resizeTerminal(cols, rows);
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(terminalRef.current);

        // Cleanup
        return () => {
            resizeObserver.disconnect();
            runManager.disposeTerminal();
        };
    }, [runManager, hidden]);

    return (
        <div
            className={cn(
                'bg-black transition-all duration-300',
                hidden ? 'h-0 w-0 invisible overflow-hidden' : 'h-[22rem] w-[37rem]',
            )}
        >
            <div ref={terminalRef} className={cn('m-2', hidden && 'invisible')} />
        </div>
    );
});

export default Terminal;
