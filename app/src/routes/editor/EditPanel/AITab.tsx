import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightIcon, FileIcon, FilePlusIcon, ImageIcon } from '@radix-ui/react-icons';

const AITab = () => {
    return (
        <div className="w-full h-[calc(100vh-8.25rem)] flex flex-col justify-end">
            <div className="w-full flex flex-row justify-end px-2">
                <div className="flex flex-col ml-8 p-2 rounded-md rounded-br-none border-2 bg-background-primary">
                    <div className="flex flex-row gap-3 text-micro mb-2">
                        <span className="flex flex-row gap-2 items-center">
                            <FileIcon />
                            map_card.tsx
                        </span>
                        <span className="flex flex-row gap-2 items-center">
                            <FileIcon />
                            button.tsx
                        </span>
                    </div>
                    <div className="text-small">
                        <p>
                            When @button.tsx is clicked, make the map card appear and have an active
                            background
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex w-full flex-col gap-6 p-4 text-small content-start">
                <p>I opened map-card.tsx and button.tsx adding in the correct classes.</p>
                <p>
                    You need to add X that will let Y happen. To make sure Y is functional, be sure
                    to test Z.
                </p>
                <p>Let me know what you think!</p>
            </div>
            <div className="flex w-full text-foreground-tertiary pt-4 px-4 border-t text-small">
                <Textarea placeholder="Ask follow up questions or provide more context..." className='p-0 border-0 min-h-[36px] resize-none' />
            </div>
            <div className="flex flex-row w-full justify-between pt-5 pb-4 px-4">
                <div className="flex flex-row justify-start gap-2.5">
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
