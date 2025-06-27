import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import stripAnsi from 'strip-ansi';

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
                <div key={index} className="text-green-400 flex items-center gap-2">
                    <Icons.Check className="h-4 w-4" />
                    <span>{cleanLine}</span>
                </div>
            );
        }

        if (cleanLine.includes('error') || cleanLine.includes('Error')) {
            return (
                <div key={index} className="text-red-400 flex items-center gap-2">
                    <Icons.CrossCircled className="h-4 w-4" />
                    <span>{cleanLine}</span>
                </div>
            );
        }

        if (cleanLine.includes('warning') || cleanLine.includes('Warning')) {
            return (
                <div key={index} className="text-yellow-400 flex items-center gap-2">
                    <Icons.ExclamationTriangle className="h-4 w-4" />
                    <span>{cleanLine}</span>
                </div>
            );
        }

        if (cleanLine.includes('$')) {
            return (
                <div key={index} className="text-blue-400 flex items-center gap-2">
                    <Icons.Terminal className="h-4 w-4" />
                    <span>{cleanLine}</span>
                </div>
            );
        }

        // Default styling for other lines
        return <div key={index} className="text-foreground-secondary">{cleanLine}</div>;
    });
};

export const BashCodeDisplay = observer(
    ({ content, defaultStdOut, defaultStdErr, isStream }: { content: string; defaultStdOut: string | null; defaultStdErr: string | null; isStream: boolean }) => {
        const editorEngine = useEditorEngine();
        const [running, setRunning] = useState(false);
        const [stdOut, setStdOut] = useState<string | null>(defaultStdOut);
        const [stdErr, setStdErr] = useState<string | null>(defaultStdErr);

        const runCommand = async () => {
            setRunning(true);
            setStdOut(null);
            setStdErr(null);

            try {
                const result = await editorEngine.sandbox.session.runCommand(content, setStdOut);

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
            <div className="flex flex-col border rounded-lg bg-background w-full text-foreground">
                <div className="flex flex-col w-full h-full">
                    <div className="relative flex p-4 text-xs w-full overflow-auto bg-background-secondary">
                        <code className="whitespace-pre">
                            <span className="text-foreground-secondary select-none mr-2">$</span>
                            {content}</code>
                    </div>
                    {(stdOut !== null || stdErr !== null) && (
                        <div className="w-full h-[1px] bg-foreground-secondary/30"></div>
                    )}
                    {stdOut !== null && (
                        <code className="px-4 py-2 text-xs w-full max-h-48 overflow-auto bg-background-secondary whitespace-pre font-mono space-y-1">
                            {formatCommandOutput(stdOut)}
                        </code>
                    )}
                    {stdErr !== null && (
                        <code className="px-4 py-2 text-xs w-full max-h-48 overflow-auto bg-background-secondary text-red-500 whitespace-pre font-mono">
                            {formatCommandOutput(stdErr)}
                        </code>
                    )}
                </div>

                <div className="flex h-8 items-center">
                    {stdOut !== null ? (
                        <Button
                            size={'sm'}
                            className="flex flex-grow rounded-none gap-2 px-1 bg-foreground/10 text-foreground group-hover:bg-foreground/20 group-hover:text-foreground-secondary transition-none"
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
                            className="group flex flex-grow rounded-none gap-2 px-1 bg-teal-400/20 text-teal-200 hover:bg-teal-400/40 hover:text-teal-100"
                            variant={'ghost'}
                            onClick={runCommand}
                            disabled={running || isStream}
                        >
                            {running ? (
                                <Icons.LoadingSpinner className="animate-spin" />
                            ) : (
                                <Icons.Play className="text-teal-300 group-hover:text-teal-100 transition-none" />
                            )}
                            Run command
                        </Button>
                    )}
                </div>
            </div>
        );
    },
);
