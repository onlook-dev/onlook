import { Button } from '@onlook/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@onlook/ui/select';
import { Icons } from '@onlook/ui/icons/index';
import { Separator } from '@onlook/ui/separator';
import { Input } from '@onlook/ui/input';

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
                        className="h-fit py-0.5 px-2.5 text-foreground-tertiary w-full"
                    >
                        <Icons.Copy className="mr-2" />
                        <span className="text-smallPlus">Duplicate</span>
                    </Button>
                    <Button
                        variant={'outline'}
                        className="h-fit py-0.5 px-2.5 text-foreground-tertiary w-full"
                    >
                        <Icons.Trash className="mr-2" />
                        <span className="text-smallPlus">Delete</span>
                    </Button>
                </div>
                <div className="flex flex-col gap-2">
                    <p className="text-smallPlus text-foreground-primary">Frame Dimensions</p>
                    <div className="flex flex-row justify-between items-center">
                        <span className="text-small text-foreground-secondary">Device</span>
                        <Select>
                            <SelectTrigger className="w-3/5 bg-background-secondary border-background-secondary py-1 px-2 h-fit">
                                <SelectValue
                                    placeholder="Theme"
                                    defaultValue={'iPhone SE'}
                                    className="text-small"
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="iPhone SE">iPhone SE</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-row justify-between items-center">
                        <span className="text-small text-foreground-secondary">Orientation</span>
                        <div className="flex flex-row p-0.5 w-3/5 bg-background-secondary rounded-md">
                            <Button
                                size={'icon'}
                                className="h-full w-full px-0.5 py-1 bg-background-tertiary rounded-md"
                                variant={'ghost'}
                            >
                                <Icons.Potrait className="h-4 w-4" />
                            </Button>
                            <Button
                                size={'icon'}
                                className="h-full w-full px-0.5 py-1 bg-background-tertiary rounded-md"
                                variant={'ghost'}
                            >
                                <Icons.Landscape className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-row justify-between items-center">
                        <span className="text-small text-foreground-secondary">Width</span>
                        <div className="relative w-3/5">
                            <Input className="bg-background-secondary border-background-secondary py-1.5 h-fit" />
                            <Icons.Link className="absolute right-2 top-1/2 transform -translate-y-1/2" />
                        </div>
                    </div>
                    <div className="flex flex-row justify-between items-center">
                        <span className="text-small text-foreground-secondary">Height</span>
                        <div className="relative w-3/5">
                            <Input className="bg-background-secondary border-background-secondary py-1.5 h-fit" />
                            <Icons.Link className="absolute right-2 top-1/2 transform -translate-y-1/2" />
                        </div>
                    </div>
                    <div className="flex flex-row justify-between items-center">
                        <span className="text-small text-foreground-secondary">Responsive</span>
                        <Select>
                            <SelectTrigger className="w-3/5 bg-background-secondary border-background-secondary py-1 px-2 h-fit">
                                <SelectValue placeholder="Theme" defaultValue={'Closest Size'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Closest Size">Closest Size</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Separator />
                <div className="flex flex-col gap-2">
                    <p className="text-smallPlus text-foreground-primary">Device Settings</p>
                    <div className="flex flex-row justify-between items-center">
                        <span className="text-small text-foreground-secondary">Theme</span>
                        <div className="flex flex-row p-0.5 w-3/5 bg-background-secondary rounded-md">
                            <Button
                                size={'icon'}
                                className="h-full w-full px-0.5 py-1 bg-background-tertiary"
                                variant={'ghost'}
                            >
                                <Icons.Moon className="h-5 w-5" />
                            </Button>
                            <Button
                                size={'icon'}
                                className="h-full w-full px-0.5 py-1 bg-background-tertiary"
                                variant={'ghost'}
                            >
                                <Icons.Landscape className="h-5 w-5" />
                            </Button>
                            <Button
                                size={'icon'}
                                className="h-full w-full px-0.5 py-1 bg-background-tertiary"
                                variant={'ghost'}
                            >
                                <Icons.Landscape className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WindowSettings;
