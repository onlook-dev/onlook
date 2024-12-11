import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { useState } from 'react';

const DeviceSettings = () => {
    const [deviceTheme, setDeviceTheme] = useState('Device');

    return (
        <div className="flex flex-col gap-2">
            <p className="text-smallPlus text-foreground-primary">Device Settings</p>
            <div className="flex flex-row justify-between items-center">
                <span className="text-small text-foreground-secondary">Theme</span>
                <div className="flex flex-row p-0.5 w-3/5 bg-background-secondary rounded-md">
                    <Button
                        size={'icon'}
                        className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-md ${deviceTheme === 'Device' ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={() => deviceTheme !== 'Device' && setDeviceTheme('Device')}
                    >
                        <Icons.Laptop />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-md ${deviceTheme === 'Dark' ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={() => deviceTheme !== 'Dark' && setDeviceTheme('Dark')}
                    >
                        <Icons.Moon />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-md ${deviceTheme === 'Light' ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={() => deviceTheme !== 'Light' && setDeviceTheme('Light')}
                    >
                        <Icons.Sun />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DeviceSettings;
