import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Separator } from '@onlook/ui/separator';
import FrameDimensions from './FrameDimensions';
import DeviceSettings from './DeviceSettings';

const WindowSettings = ({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) => {
    return (
        <div className="flex flex-col">
            <div className="rounded-lg p-1 text-muted-foreground bg-transparent w-full gap-2 select-none justify-between items-center h-full px-2">
                <div className="flex flex-row items-center gap-2">
                    <button
                        className="text-default rounded-lg p-2 bg-transparent hover:text-foreground-hover"
                        onClick={() => setIsOpen(false)}
                    >
                        <Icons.PinRight />
                    </button>
                    <div className="bg-transparent py-2 px-1 text-xs text-foreground-primary">
                        Window
                    </div>
                </div>
            </div>
            <Separator />
            <div className="flex flex-col gap-3 px-3 py-2">
                <div className="flex flex-row gap-1">
                    <Button
                        variant={'outline'}
                        className="h-fit py-1.5 px-2.5 text-foreground-tertiary w-full items-center"
                    >
                        <Icons.Copy className="mr-2" />
                        <span className="text-xs">Duplicate</span>
                    </Button>
                    <Button
                        variant={'outline'}
                        className="h-fit py-1.5 px-2.5 text-foreground-tertiary w-full items-center"
                    >
                        <Icons.Trash className="mr-2" />
                        <span className="text-xs">Delete</span>
                    </Button>
                </div>
                <FrameDimensions />
                <Separator />
                <DeviceSettings />
            </div>
        </div>
    );
};

export default WindowSettings;
