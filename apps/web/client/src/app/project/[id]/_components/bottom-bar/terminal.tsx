'use client';

import '@xterm/xterm/css/xterm.css';

import { useEditorEngine } from '@/components/store/editor';
import { cn } from '@onlook/ui/utils';
import { Terminal as XTerm, type IDisposable, type ITheme } from '@xterm/xterm';
import { observer } from 'mobx-react-lite';
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

interface TerminalProps {
    hidden: boolean;
    terminalSessionId: string;
}

const TERMINAL_THEME: Record<'LIGHT' | 'DARK', ITheme> = {
    LIGHT: {
        background: '#ffffff',
        foreground: '#2d2d2d',
        cursor: '#333333',
        cursorAccent: '#ffffff',
        black: '#2d2d2d',
        red: '#d64646',
        green: '#4e9a06',
        yellow: '#c4a000',
        blue: '#3465a4',
        magenta: '#75507b',
        cyan: '#06989a',
        white: '#d3d7cf',
        brightBlack: '#555753',
        brightRed: '#ef2929',
        brightGreen: '#8ae234',
        brightYellow: '#fce94f',
        brightBlue: '#729fcf',
        brightMagenta: '#ad7fa8',
        brightCyan: '#34e2e2',
        brightWhite: '#eeeeec',
        selectionBackground: '#bfbfbf',
    },
    DARK: {}, // Use default dark theme
};

export const Terminal = observer(({ hidden = false, terminalSessionId }: TerminalProps) => {
    const xtermRef = useRef<XTerm | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    const editorEngine = useEditorEngine();
    const terminalSession = editorEngine.sandbox.session.getTerminalSession(terminalSessionId);

    useEffect(() => {
        if (xtermRef.current) {
            xtermRef.current.options.theme = theme === 'light' ? TERMINAL_THEME.LIGHT : TERMINAL_THEME.DARK;
        }
    }, [theme]);

    useEffect(() => {
        if (!hidden && xtermRef.current) {
            setTimeout(() => {
                xtermRef.current?.focus();
            }, 100);
        }
    }, [hidden]);

    useEffect(() => {

        if (xtermRef.current) return; // Already initialized

        let terminalOutputListener: IDisposable | undefined;
        let xtermDataListener: IDisposable | undefined;

        (async () => {
            const { terminalOutputListener: outputListener, xtermDataListener: dataListener } = await initTerminal();
            terminalOutputListener = outputListener;
            xtermDataListener = dataListener;
        })();

        return () => {
            xtermRef.current?.dispose();
            terminalSession?.terminal.kill();
            xtermRef.current = null;
            terminalOutputListener?.dispose();
            xtermDataListener?.dispose();
        };
    }, []);

    async function initTerminal(): Promise<{ terminalOutputListener: IDisposable | undefined, xtermDataListener: IDisposable | undefined }> {
        if (!containerRef.current) {
            return {
                terminalOutputListener: { dispose: () => { } } as IDisposable,
                xtermDataListener: { dispose: () => { } },
            };
        }

        const xterm = new XTerm({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'monospace',
            theme: theme === 'light' ? TERMINAL_THEME.LIGHT : TERMINAL_THEME.DARK,
            convertEol: true,
            allowTransparency: true,
            disableStdin: false,
            allowProposedApi: true,
            macOptionIsMeta: true,
        });

        console.log('open terminal', terminalSession);
        xterm.open(containerRef.current);
        await terminalSession?.terminal.open();
        terminalSession?.terminal.write('\n');

        const terminalOutputListener = terminalSession?.terminal.onOutput((output: string) => {
            xterm.write(output)
        });

        const xtermDataListener = xterm.onData((data: string) => {
            terminalSession?.terminal.write(data)
        })

        xtermRef.current = xterm;

        return {
            terminalOutputListener,
            xtermDataListener,
        };
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                'h-full w-full p-2 transition-opacity duration-200',
                hidden ? 'opacity-0' : 'opacity-100 delay-300',
            )}
        />

    );
});
