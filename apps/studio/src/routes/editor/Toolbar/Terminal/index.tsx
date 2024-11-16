import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { FitAddon } from '@xterm/addon-fit';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import 'xterm/css/xterm.css';

interface TerminalMessage {
    id: string;
    data: string;
}

const TERMINAL_CONFIG = {
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'monospace',
} as const;

const Terminal = observer(() => {
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
            const fitAddon = new FitAddon();

            initializeTerminal(term, fitAddon);
            setupEventListeners(term, fitAddon);

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

    const sendCreateCommand = async () => {
        const res = await invokeMainChannel(MainChannels.TERMINAL_CREATE, { id });
        if (!res) {
            console.error('Failed to create terminal.');
            return;
        }
        return res;
    };

    const initializeTerminal = (term: XTerm, fitAddon: FitAddon) => {
        term.loadAddon(fitAddon);
        term.open(terminalRef.current!);
        fitAddon.fit();
    };

    const setupEventListeners = (term: XTerm, fitAddon: FitAddon) => {
        const handleResize = () => {
            fitAddon.fit();
            const { cols, rows } = term;
            const res = invokeMainChannel(MainChannels.TERMINAL_RESIZE, { id, cols, rows });
            if (!res) {
                console.error('Failed to resize terminal.');
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
});

export default Terminal;
