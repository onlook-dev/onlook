import { MainChannels } from '@onlook/models/constants';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef } from 'react';

interface TerminalProps {
    id?: string;
}

interface TerminalMessage {
    id: string;
    data: string;
}

const TERMINAL_CONFIG = {
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'monospace',
} as const;

const Terminal = ({ id = 'default' }: TerminalProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm>();

    useEffect(() => {
        if (!terminalRef.current) {
            return;
        }

        const setupTerminal = async () => {
            await window.api.invoke(MainChannels.TERMINAL_CREATE, { id });

            const term = new XTerm(TERMINAL_CONFIG);
            const fitAddon = new FitAddon();

            initializeTerminal(term, fitAddon);
            setupEventListeners(term, fitAddon);

            xtermRef.current = term;
            return term;
        };

        const cleanup = setupTerminal();

        return () => {
            cleanup.then((term) => {
                term.dispose();
                window.api.invoke(MainChannels.TERMINAL_KILL, { id });
            });
        };
    }, [id]);

    const initializeTerminal = (term: XTerm, fitAddon: FitAddon) => {
        term.loadAddon(fitAddon);
        term.open(terminalRef.current!);
        fitAddon.fit();
    };

    const setupEventListeners = (term: XTerm, fitAddon: FitAddon) => {
        const handleResize = () => {
            fitAddon.fit();
            const { cols, rows } = term;
            window.api.invoke(MainChannels.TERMINAL_RESIZE, { id, cols, rows });
        };

        const handleTerminalData = (message: TerminalMessage) => {
            if (message.id === id) {
                term.write(message.data);
            }
        };

        term.onData((data: string) => {
            window.api.invoke(MainChannels.TERMINAL_INPUT, { id, data });
        });

        window.api.on(MainChannels.TERMINAL_DATA_STREAM, handleTerminalData);
        window.addEventListener('resize', handleResize);

        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    };

    return (
        <div className="p-2 bg-black">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
};

export default Terminal;
