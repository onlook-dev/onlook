import { Button } from '@/components/ui/button';
import { getTruncatedFileName } from '@/lib/utils';
import { CopyIcon, Cross1Icon, SizeIcon } from '@radix-ui/react-icons';
import { CodeBlock } from './CodeBlock';
import { CodeChangeContentBlock } from '/common/models/chat/message/content';

export default function CodeChangeBlock({ content }: { content: CodeChangeContentBlock }) {
    return (
        <div key={content.id} className="flex flex-col gap-3 items-center">
            {content.changes.map((change) => (
                <div className="w-full flex flex-col" key={change.fileName}>
                    <div className="rounded border bg-black-30">
                        <p className="flex px-2 h-8 items-center rounded-t">
                            {getTruncatedFileName(change.fileName)}
                        </p>
                        <div className="border py-2 bg-background-primary h-80 w-full">
                            <CodeBlock code={change.value} />
                        </div>
                        <div className="flex h-8 items-center justify-end">
                            <Button size={'sm'} className="rounded-none gap-2" variant={'ghost'}>
                                <SizeIcon />
                                Expand
                            </Button>
                            <Button size={'sm'} className="rounded-none gap-2" variant={'ghost'}>
                                <CopyIcon />
                                Copy
                            </Button>
                            <Button size={'sm'} className="rounded-none gap-2" variant={'ghost'}>
                                <Cross1Icon />
                                Reject
                            </Button>
                        </div>
                    </div>
                    <p className="mt-2">{change.description}</p>
                </div>
            ))}
        </div>
    );
}
