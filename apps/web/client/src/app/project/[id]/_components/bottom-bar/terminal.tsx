'use client';

import '@xterm/xterm/css/xterm.css';

import { useEditorEngine } from '@/components/store/editor';
import type { Terminal as CsbTerminal, WebSocketSession } from '@codesandbox/sdk';
import { cn } from '@onlook/ui/utils';
import { Terminal as XTerm, type ITheme } from '@xterm/xterm';
import { observer } from 'mobx-react-lite';
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

interface TerminalProps {
    hidden?: boolean;
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

export const Terminal = observer(({ hidden = false }: TerminalProps) => {
    const editorEngine = useEditorEngine();
    const sandboxSession = editorEngine.sandbox.session.session;
    const sessionId = useRef<string | null>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const terminalRef = useRef<CsbTerminal | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

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
        if (!sandboxSession) {
            console.error('sandboxSession is null');
            return;
        }

        if (sessionId.current === sandboxSession.id) {
            console.error('sessionId is the same');
            return;
        }
        sessionId.current = sandboxSession.id;

        if (xtermRef.current || terminalRef.current) return; // Already initialized

        let terminalOutputListener: { dispose: () => void } | undefined;
        let xtermDataListener: { dispose: () => void } | undefined;

        (async () => {
            const { terminalOutputListener: outputListener, xtermDataListener: dataListener } = await initTerminal(
                sandboxSession,
            );
            terminalOutputListener = outputListener;
            xtermDataListener = dataListener;
        })();

        return () => {
            xtermRef.current?.dispose();
            terminalRef.current?.kill();
            xtermRef.current = null;
            terminalRef.current = null;
            terminalOutputListener?.dispose();
            xtermDataListener?.dispose();
        };
    }, [sandboxSession]);

    async function initTerminal(session: WebSocketSession): Promise<{ terminalOutputListener: { dispose: () => void }, xtermDataListener: { dispose: () => void } }> {
        if (!containerRef.current) {
            return {
                terminalOutputListener: { dispose: () => { } },
                xtermDataListener: { dispose: () => { } },
            };
        }
        const terminal = await session.terminals.create()

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

        xterm.open(containerRef.current);
        await terminal.open();
        terminal.write('\n')

        const terminalOutputListener = terminal.onOutput((output: string) => {
            xterm.write(output)
        });

        const xtermDataListener = xterm.onData((data: string) => {
            terminal.write(data)
        })

        xtermRef.current = xterm;
        terminalRef.current = terminal;

        return {
            terminalOutputListener,
            xtermDataListener,
        };
    }

    return (
        <div
            className={cn(
                'bg-background rounded-lg overflow-auto transition-all duration-300',
                hidden ? 'h-0 w-0 invisible' : 'h-[22rem] w-[37rem]',
            )}
        >
            <div
                ref={containerRef}
                className={cn(
                    'h-full w-full p-2 transition-opacity duration-200',
                    hidden ? 'opacity-0' : 'opacity-100 delay-300',
                )}
            />
        </div>
    );
});
