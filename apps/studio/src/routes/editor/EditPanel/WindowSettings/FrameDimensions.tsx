import { useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@onlook/ui/select';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';

const deviceOptions = [
    'iPhone SE',
    'iPhone 12',
    'iPhone 12 Pro',
    'iPhone 12 Pro Max',
    'iPhone 11',
    'iPhone 11 Pro',
    'iPhone 11 Pro Max',
    'Google Pixel 5',
    'Google Pixel 4a',
    'Samsung Galaxy S21',
    'Samsung Galaxy S21+',
    'Samsung Galaxy S21 Ultra',
    'Samsung Galaxy Note 20',
    'Samsung Galaxy Note 20 Ultra',
    'OnePlus 9',
    'OnePlus 9 Pro',
];

const FrameDimensions = () => {
    const [device, setDevice] = useState('iPhone SE');
    const [orientation, setOrientation] = useState('Potrait');
    const [width, setWidth] = useState('375px');
    const [height, setHeight] = useState('667px');
    const [responsive, setResponsive] = useState('Closest Size');

    return (
        <div className="flex flex-col gap-2">
            <p className="text-smallPlus text-foreground-primary">Frame Dimensions</p>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Device</span>
                <Select value={device} onValueChange={setDevice}>
                    <SelectTrigger className="w-3/5 bg-background-secondary border-background-secondary py-1.5 px-2 h-fit text-xs rounded focus:outline-none focus:ring-0">
                        <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md bg-background-secondary">
                        {deviceOptions.map((deviceName) => (
                            <SelectItem
                                key={deviceName}
                                value={deviceName}
                                className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                            >
                                {deviceName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Orientation</span>
                <div className="flex flex-row p-0.5 w-3/5 bg-background-secondary rounded">
                    <Button
                        size={'icon'}
                        className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${orientation === 'Potrait' ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={() => orientation === 'Landscape' && setOrientation('Potrait')}
                    >
                        <Icons.Potrait
                            className={`h-4 w-4 ${orientation !== 'Potrait' ? 'text-foreground-secondary hover:text-foreground-onlook' : ''}`}
                        />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${orientation === 'Landscape' ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={() => orientation === 'Potrait' && setOrientation('Landscape')}
                    >
                        <Icons.Landscape
                            className={`h-4 w-4 ${orientation !== 'Landscape' ? 'text-foreground-secondary hover:text-foreground-onlook' : ''}`}
                        />
                    </Button>
                </div>
            </div>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Width</span>
                <div className="relative w-3/5">
                    <Input
                        className="w-full px-2 h-8 text-xs rounded border-none text-foreground-active bg-background-secondary text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={width}
                        onChange={(event) => setWidth(event.target.value)}
                    />
                    <Button
                        size={'icon'}
                        className="p-0 h-fit w-fit absolute right-2 top-1/2 transform -translate-y-1/2"
                        variant={'ghost'}
                    >
                        <Icons.Link className="text-foreground-secondary" />
                    </Button>
                </div>
            </div>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Height</span>
                <div className="relative w-3/5">
                    <Input
                        className="w-full px-2 h-8 text-xs rounded border-none text-foreground-active bg-background-secondary text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={height}
                        onChange={(event) => setHeight(event.target.value)}
                    />
                    <Button
                        size={'icon'}
                        className="p-0 h-fit w-fit absolute right-2 top-1/2 transform -translate-y-1/2"
                        variant={'ghost'}
                    >
                        <Icons.Link className="text-foreground-secondary" />
                    </Button>
                </div>
            </div>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Responsive</span>
                <Select value={responsive} onValueChange={setResponsive}>
                    <SelectTrigger className="w-3/5 rounded bg-background-secondary border-background-secondary px-2 h-8 text-xs">
                        <SelectValue placeholder="Select size" defaultValue={'Closest Size'} />
                    </SelectTrigger>
                    <SelectContent className="rounded-md bg-background-secondary">
                        <SelectItem
                            value="Closest Size"
                            className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                        >
                            Closest Size
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default FrameDimensions;
