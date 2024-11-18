import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { cn } from '@onlook/ui/utils';
// import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';

interface TerminalMessage {
    id: string;
    data: string;
}

const TERMINAL_CONFIG = {
    cursorBlink: true,
    fontSize: 12,
    fontFamily: 'monospace',
} as const;

interface TerminalProps {
    hidden?: boolean;
}

const Terminal = observer(({ hidden = false }: TerminalProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm>();
    const projectManager = useProjectsManager();
    const id = projectManager.project?.id ?? 'default';

    useEffect(() => {
        if (!terminalRef.current) {
            return;
        }

        const setupTerminal = async () => {
            const term = new XTerm(TERMINAL_CONFIG);
            initializeTerminal(term);
            setupEventListeners(term);

            xtermRef.current = term;
            return term;
        };

        const cleanup = setupTerminal();

        return () => {
            cleanup.then((term) => {
                if (term) {
                    term.dispose();
                }
                const res = invokeMainChannel(MainChannels.TERMINAL_KILL, { id });
                if (!res) {
                    console.error('Failed to kill terminal.');
                }
            });
        };
    }, [id]);

    const initializeTerminal = (term: XTerm) => {
        term.open(terminalRef.current!);
        const { cols, rows } = term;
        invokeMainChannel(MainChannels.TERMINAL_RESIZE, { id, cols, rows });
    };

    const setupEventListeners = (term: XTerm) => {
        const handleResize = () => {
            if (!hidden) {
                const { cols, rows } = term;
                invokeMainChannel(MainChannels.TERMINAL_RESIZE, { id, cols, rows });
            }
        };

        const handleTerminalData = (message: TerminalMessage) => {
            if (message.id === id) {
                term.write(message.data);
            }
        };

        term.onData((data) => {
            const res = invokeMainChannel(MainChannels.TERMINAL_INPUT, { id, data });
            if (!res) {
                console.error('Failed to send terminal input.');
            }
        });

        window.api.on(MainChannels.TERMINAL_DATA_STREAM, handleTerminalData);
        terminalRef.current?.addEventListener('resize', handleResize);

        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });

        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        return () => {
            terminalRef.current?.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    };

    return (
        <div
            className={cn(
                'bg-black transition-all duration-300',
                hidden ? 'h-0 w-0 invisible' : 'h-[22rem] w-[40rem]',
            )}
        >
            <div ref={terminalRef} className={cn('m-2')} />
        </div>
    );
});

export default Terminal;
