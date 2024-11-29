import { useProjectsManager } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import type { RunManager, TerminalMessage } from '@/lib/projects/run';
import { MainChannels } from '@onlook/models/constants';
import { RunState } from '@onlook/models/run';
import { cn } from '@onlook/ui/utils';
import { Terminal as XTerm, type ITheme } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';

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

const Terminal = observer(({ hidden = false }: TerminalProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const [terminal, setTerminal] = useState<XTerm | null>(null);
    const projectManager = useProjectsManager();
    const runner = projectManager.runner;
    const { theme } = useTheme();

    useEffect(() => {
        if (terminal) {
            terminal.options.theme = theme === 'light' ? TERMINAL_THEME.LIGHT : TERMINAL_THEME.DARK;
        }
    }, [theme]);

    useEffect(() => {
        if (!terminalRef.current || !runner || terminal) {
            return;
        }

        const { term, terminalDataListener, stateListener } = initTerminal(
            runner,
            terminalRef.current,
        );
        setTerminal(term);

        return () => {
            term.dispose();
            setTerminal(null);
            window.api.removeListener(MainChannels.TERMINAL_ON_DATA, terminalDataListener);
            window.api.removeListener(MainChannels.RUN_STATE_CHANGED, stateListener);
        };
    }, []);

    function initTerminal(runner: RunManager, container: HTMLDivElement) {
        const term = new XTerm({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'monospace',
            theme: theme === 'light' ? TERMINAL_THEME.LIGHT : TERMINAL_THEME.DARK,
            convertEol: true,
            allowTransparency: true,
            disableStdin: false,
            allowProposedApi: true,
        });

        term.open(container);
        const { cols, rows } = term;
        runner.resizeTerminal(cols, rows);

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

        const terminalDataListener = (message: TerminalMessage) => {
            if (message.isError) {
                term.write('\x1b[91m' + message.data + '\x1b[0m');
            } else {
                term.write(message.data);
            }
        };

        const stateListener = ({ state, message }: { state: RunState; message: string }) => {
            term.write('\x1b[96m' + message + '\x1b[0m\n');
        };

        window.api.on(MainChannels.TERMINAL_ON_DATA, terminalDataListener);
        window.api.on(MainChannels.RUN_STATE_CHANGED, stateListener);
        return { term, terminalDataListener, stateListener };
    }

    return (
        <div
            className={cn(
                'bg-background rounded-lg overflow-hidden transition-all duration-300',
                hidden ? 'h-0 w-0 invisible' : 'h-[22rem] w-[37rem]',
            )}
        >
            <div
                ref={terminalRef}
                className={cn(
                    'h-full w-full p-2 transition-opacity duration-200',
                    hidden ? 'opacity-0' : 'opacity-100 delay-300',
                )}
            />
        </div>
    );
});

export default Terminal;
