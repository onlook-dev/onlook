import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

export default function BashCodeDisplay({ content }: { content: string }) {
    const commandRan = true;
    const result = 'success';
    const runCommand = () => {
        if (commandRan) {
            console.log('Retrying command:', content);
        } else {
            console.log('Running command:', content);
        }
    };

    return (
        <div className="flex flex-col border rounded-lg bg-background w-full text-foreground">
            <div className="flex flex-col w-full h-full">
                <code className="p-4 text-xs w-full overflow-x-auto bg-background-secondary">
                    $ {content}
                </code>

                {result && (
                    <>
                        <div className="w-full h-[1px] bg-foreground-secondary/30"></div>
                        <code className="px-4 py-2 text-xs w-full overflow-x-auto bg-background-secondary">
                            {result}
                        </code>
                    </>
                )}
            </div>

            <div className="flex h-8 items-center">
                {commandRan ? (
                    <Button
                        size={'sm'}
                        className="flex flex-grow rounded-none gap-2 px-1 bg-foreground/10 text-foreground group-hover:bg-foreground/20 group-hover:text-foreground-secondary transition-none"
                        variant={'ghost'}
                        onClick={runCommand}
                    >
                        <Icons.Reload className="text-foreground group-hover:text-foreground-secondary transition-none" />
                        Retry
                    </Button>
                ) : (
                    <Button
                        size={'sm'}
                        className="group flex flex-grow rounded-none gap-2 px-1 bg-teal-400/20 text-teal-200 hover:bg-teal-400/40 hover:text-teal-100"
                        variant={'ghost'}
                        onClick={runCommand}
                    >
                        <Icons.Play className="text-teal-300 group-hover:text-teal-100 transition-none" />
                        Run command
                    </Button>
                )}
            </div>
        </div>
    );
}
