import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

export default function BashCodeDisplay({ content }: { content: string }) {
    return (
        <div className="flex flex-col border rounded-lg bg-background w-full text-foreground">
            <div className="flex flex-col w-full h-full">
                <code className="p-4 text-xs w-full overflow-x-auto bg-background-secondary">
                    $ {content}
                </code>
            </div>
            <div className="flex h-8 items-center">
                <Button
                    size={'sm'}
                    className="group flex flex-grow rounded-none gap-2 px-1 bg-teal-400/20 text-teal-200 hover:bg-teal-400/40 hover:text-teal-100"
                    variant={'ghost'}
                >
                    <Icons.Play className="text-teal-300 group-hover:text-teal-100 transition-none" />
                    Run command
                </Button>
            </div>
        </div>
    );
}
