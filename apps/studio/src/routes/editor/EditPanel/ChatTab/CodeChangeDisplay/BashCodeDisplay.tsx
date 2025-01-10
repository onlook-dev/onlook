import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';

export default function BashCodeDisplay({ content }: { content: string }) {
    const [commandResult, setCommandResult] = useState<string | null>(null);
    const [running, setRunning] = useState(false);

    const runCommand = () => {
        setRunning(true);
        setTimeout(() => {
            setCommandResult('success');
            setRunning(false);
        }, 1000);
    };

    return (
        <div className="flex flex-col border rounded-lg bg-background w-full text-foreground">
            <div className="flex flex-col w-full h-full">
                <div className="relative flex items-center p-4 text-xs w-full overflow-x-auto bg-background-secondary">
                    <span className="text-foreground-secondary select-none mr-2">$</span>
                    <code className="w-full">{content}</code>
                </div>
                {commandResult && (
                    <>
                        <div className="w-full h-[1px] bg-foreground-secondary/30"></div>
                        <code className="px-4 py-2 text-xs w-full overflow-x-auto bg-background-secondary">
                            {commandResult}
                        </code>
                    </>
                )}
            </div>

            <div className="flex h-8 items-center">
                {commandResult ? (
                    <Button
                        size={'sm'}
                        className="flex flex-grow rounded-none gap-2 px-1 bg-foreground/10 text-foreground group-hover:bg-foreground/20 group-hover:text-foreground-secondary transition-none"
                        variant={'ghost'}
                        onClick={runCommand}
                        disabled={running}
                    >
                        {running ? (
                            <Icons.Shadow className="animate-spin" />
                        ) : (
                            <Icons.Reload className="text-foreground group-hover:text-foreground-secondary transition-none" />
                        )}
                        Retry
                    </Button>
                ) : (
                    <Button
                        size={'sm'}
                        className="group flex flex-grow rounded-none gap-2 px-1 bg-teal-400/20 text-teal-200 hover:bg-teal-400/40 hover:text-teal-100"
                        variant={'ghost'}
                        onClick={runCommand}
                        disabled={running}
                    >
                        {running ? (
                            <Icons.Shadow className="animate-spin" />
                        ) : (
                            <Icons.Play className="text-teal-300 group-hover:text-teal-100 transition-none" />
                        )}
                        Run command
                    </Button>
                )}
            </div>
        </div>
    );
}
