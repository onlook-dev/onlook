import { useProjectsManager } from '@/components/Context';
import type { RunManager, TerminalMessage } from '@/lib/projects/run';
import { MainChannels } from '@onlook/models/constants';
import { cn } from '@onlook/ui/utils';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';

interface TerminalProps {
    hidden?: boolean;
}

const Terminal = observer(({ hidden = false }: TerminalProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const [terminal, setTerminal] = useState<XTerm | null>(null);
    const projectManager = useProjectsManager();
    const runner = projectManager.runner;

    useEffect(() => {
        if (!terminalRef.current || !runner || terminal) {
            return;
        }

        const { term, dataListener } = initTerminal(runner, terminalRef.current);
        setTerminal(term);

        return () => {
            term.dispose();
            setTerminal(null);
            window.api.removeListener(MainChannels.TERMINAL_ON_DATA, dataListener);
        };
    }, []);

    function initTerminal(runner: RunManager, container: HTMLDivElement) {
        const term = new XTerm({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'monospace',
            rows: 24,
            cols: 50,
        });

        term.open(container);
        const { cols, rows } = term;
        runner.resizeTerminal(cols, rows);

        // Load terminal history
        runner.getHistory().then((history) => {
            if (history) {
                term.write(history);
            }
        });

        // Set up event listeners
        term.onData((data) => {
            runner.handleTerminalInput(data);
        });

        term.onResize(({ cols, rows }) => {
            runner.resizeTerminal(cols, rows);
        });

        // Set up data stream listener
        const dataListener = (message: TerminalMessage) => {
            if (message.id === projectManager.project?.id) {
                term.write(message.data);
            }
        };

        window.api.on(MainChannels.TERMINAL_ON_DATA, dataListener);

        return { term, dataListener };
    }

    return (
        <div
            className={cn(
                'bg-black transition-all duration-300',
                hidden ? 'h-0 w-0 invisible overflow-hidden' : 'h-[22rem] w-[37rem]',
            )}
        >
            <div ref={terminalRef} className={cn('h-full w-full p-2', hidden && 'invisible')} />
        </div>
    );
});

export default Terminal;
