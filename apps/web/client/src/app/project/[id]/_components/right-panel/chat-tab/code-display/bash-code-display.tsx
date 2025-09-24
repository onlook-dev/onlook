import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import stripAnsi from 'strip-ansi';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

import { useEditorEngine } from '@/components/store/editor';

const formatCommandOutput = (output: string | null) => {
    if (output === null) {
        return null;
    }
    const lines = output.split('\n');

    return lines.map((line, index) => {
        // Handle ANSI color codes and special characters
        const cleanLine = stripAnsi(line);

        // Add appropriate styling based on line content
        if (cleanLine.includes('installed')) {
            return (
                <div key={index} className="flex items-center gap-2 text-green-400">
                    <Icons.Check className="h-4 w-4" />
                    <span>{cleanLine}</span>
                </div>
            );
        }

        if (cleanLine.includes('error') || cleanLine.includes('Error')) {
            return (
                <div key={index} className="flex items-center gap-2 text-red-400">
                    <Icons.CrossCircled className="h-4 w-4" />
                    <span>{cleanLine}</span>
                </div>
            );
        }

        if (cleanLine.includes('warning') || cleanLine.includes('Warning')) {
            return (
                <div key={index} className="flex items-center gap-2 text-yellow-400">
                    <Icons.ExclamationTriangle className="h-4 w-4" />
                    <span>{cleanLine}</span>
                </div>
            );
        }

        if (cleanLine.includes('$')) {
            return (
                <div key={index} className="flex items-center gap-2 text-blue-400">
                    <Icons.Terminal className="h-4 w-4" />
                    <span>{cleanLine}</span>
                </div>
            );
        }

        // Default styling for other lines
        return (
            <div key={index} className="text-foreground-secondary">
                {cleanLine}
            </div>
        );
    });
};

export const BashCodeDisplay = observer(
    ({
        content,
        defaultStdOut,
        defaultStdErr,
        isStream,
    }: {
        content: string;
        defaultStdOut: string | null;
        defaultStdErr: string | null;
        isStream: boolean;
    }) => {
        const editorEngine = useEditorEngine();
        const [running, setRunning] = useState(false);
        const [stdOut, setStdOut] = useState<string | null>(defaultStdOut);
        const [stdErr, setStdErr] = useState<string | null>(defaultStdErr);

        const runCommand = async () => {
            setRunning(true);
            setStdOut(null);
            setStdErr(null);

            try {
                const result = await editorEngine.activeSandbox.session.runCommand(
                    content,
                    setStdOut,
                );

                if (!result) {
                    setStdErr('Failed to execute command: No session available');
                    return;
                }

                if (!result.success) {
                    setStdErr(result.error || 'Failed to execute command');
                } else {
                    setStdOut(result.output || '');
                }
            } catch (error) {
                setStdErr(error instanceof Error ? error.message : 'An unexpected error occurred');
            } finally {
                setRunning(false);
            }
        };

        return (
            <div className="bg-background text-foreground flex w-full flex-col rounded-lg border">
                <div className="flex h-full w-full flex-col">
                    <div className="bg-background-secondary relative flex w-full overflow-auto p-4 text-xs">
                        <code className="whitespace-pre">
                            <span className="text-foreground-secondary mr-2 select-none">$</span>
                            {content}
                        </code>
                    </div>
                    {(stdOut !== null || stdErr !== null) && (
                        <div className="bg-foreground-secondary/30 h-[1px] w-full"></div>
                    )}
                    {stdOut !== null && (
                        <code className="bg-background-secondary max-h-48 w-full space-y-1 overflow-auto px-4 py-2 font-mono text-xs whitespace-pre">
                            {formatCommandOutput(stdOut)}
                        </code>
                    )}
                    {stdErr !== null && (
                        <code className="bg-background-secondary max-h-48 w-full overflow-auto px-4 py-2 font-mono text-xs whitespace-pre text-red-500">
                            {formatCommandOutput(stdErr)}
                        </code>
                    )}
                </div>

                <div className="flex h-8 items-center">
                    {stdOut !== null ? (
                        <Button
                            size={'sm'}
                            className="bg-foreground/10 text-foreground group-hover:bg-foreground/20 group-hover:text-foreground-secondary flex flex-grow gap-2 rounded-none px-1 transition-none"
                            variant={'ghost'}
                            onClick={runCommand}
                            disabled={running || isStream}
                        >
                            {running ? (
                                <Icons.LoadingSpinner className="animate-spin" />
                            ) : (
                                <Icons.Reload className="text-foreground group-hover:text-foreground-secondary transition-none" />
                            )}
                            Run again
                        </Button>
                    ) : (
                        <Button
                            size={'sm'}
                            className="group flex flex-grow gap-2 rounded-none bg-teal-400/20 px-1 text-teal-200 hover:bg-teal-400/40 hover:text-teal-100"
                            variant={'ghost'}
                            onClick={runCommand}
                            disabled={running || isStream}
                        >
                            {running ? (
                                <Icons.LoadingSpinner className="animate-spin" />
                            ) : (
                                <Icons.Play className="text-teal-300 transition-none group-hover:text-teal-100" />
                            )}
                            Run command
                        </Button>
                    )}
                </div>
            </div>
        );
    },
);
