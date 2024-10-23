import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightIcon, FilePlusIcon, ImageIcon } from '@radix-ui/react-icons';
import ChatPanel from './ChatPanel';

const AITab = () => {
    return (
        <div className="w-full h-[calc(100vh-8.25rem)] flex flex-col justify-end">
            <ChatPanel />
            <div className="flex w-full text-foreground-tertiary pt-4 px-4 border-t text-small">
                <Textarea
                    placeholder="Ask follow up questions or provide more context..."
                    className="p-0 border-0 shadow-none rounded-none caret-[#FA003C] selection:bg-[#FA003C]/30 selection:text-[#FA003C] text-foreground-primary placeholder:text-foreground-primary/50"
                    rows={1}
                    style={{ resize: 'none' }}
                    onInput={(e) => {
                        e.currentTarget.style.height = 'auto'; // Reset height
                        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                    }}
                />
            </div>
            <div className="flex flex-row w-full justify-between pt-5 pb-4 px-4">
                <div className="flex flex-row justify-start gap-1.5">
                    <Button
                        variant={'outline'}
                        className="w-fit h-fit py-0.5 px-2.5 text-foreground-tertiary"
                    >
                        <ImageIcon className="mr-2" />
                        <span className="text-smallPlus">Image</span>
                    </Button>
                    <Button
                        variant={'outline'}
                        className="w-fit h-fit py-0.5 px-2.5 text-foreground-tertiary"
                    >
                        <FilePlusIcon className="mr-2" />
                        <span className="text-smallPlus">File Reference</span>
                    </Button>
                </div>
                <Button
                    size={'icon'}
                    variant={'secondary'}
                    className="text-smallPlus w-fit h-full py-0.5 px-2.5 text-primary"
                >
                    <ArrowRightIcon />
                </Button>
            </div>
        </div>
    );
};

export default AITab;
