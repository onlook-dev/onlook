import { MainChannels } from '@onlook/models/constants';
import { FitAddon } from '@xterm/addon-fit';
import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import 'xterm/css/xterm.css';

const Terminal = ({ id = 'default' }: { id?: string }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm>();

    useEffect(() => {
        if (!terminalRef.current) {
            return;
        }

        window.api.invoke(MainChannels.TERMINAL_CREATE, { id });

        const term = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'monospace',
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        // Handle user input
        term.onData((data) => {
            window.api.invoke(MainChannels.TERMINAL_INPUT, {
                id,
                data,
            });
        });

        // Handle terminal output
        window.api.on(
            MainChannels.TERMINAL_DATA_STREAM,
            (message: { id: string; data: string }) => {
                if (message.id === id) {
                    term.write(message.data);
                }
            },
        );

        // Handle resize
        const handleResize = () => {
            fitAddon.fit();
            const { cols, rows } = term;
            window.api.invoke(MainChannels.TERMINAL_RESIZE, { id, cols, rows });
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        xtermRef.current = term;

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            window.api.invoke(MainChannels.TERMINAL_KILL, { id });
        };
    }, [id]);

    return (
        <div className="p-2 bg-black">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
};

export default Terminal;
