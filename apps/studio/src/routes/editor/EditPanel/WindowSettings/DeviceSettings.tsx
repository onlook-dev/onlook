import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { useState } from 'react';

enum DeviceTheme {
    Device = 'Device',
    Dark = 'Dark',
    Light = 'Light',
}

const DeviceSettings = () => {
    const [deviceTheme, setDeviceTheme] = useState(DeviceTheme.Device);

    return (
        <div className="flex flex-col gap-2">
            <p className="text-smallPlus text-foreground-primary">Device Settings</p>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Theme</span>
                <div className="flex flex-row p-0.5 w-3/5 bg-background-secondary rounded">
                    <Button
                        size={'icon'}
                        className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${
                            deviceTheme === DeviceTheme.Device
                                ? 'bg-background-tertiary hover:bg-background-tertiary'
                                : 'hover:bg-background-tertiary/50 text-foreground-onlook'
                        }`}
                        variant={'ghost'}
                        onClick={() =>
                            deviceTheme !== DeviceTheme.Device && setDeviceTheme(DeviceTheme.Device)
                        }
                    >
                        <Icons.Laptop />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${
                            deviceTheme === DeviceTheme.Dark
                                ? 'bg-background-tertiary hover:bg-background-tertiary'
                                : 'hover:bg-background-tertiary/50 text-foreground-onlook'
                        }`}
                        variant={'ghost'}
                        onClick={() =>
                            deviceTheme !== DeviceTheme.Dark && setDeviceTheme(DeviceTheme.Dark)
                        }
                    >
                        <Icons.Moon />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${
                            deviceTheme === DeviceTheme.Light
                                ? 'bg-background-tertiary hover:bg-background-tertiary'
                                : 'hover:bg-background-tertiary/50 text-foreground-onlook'
                        }`}
                        variant={'ghost'}
                        onClick={() =>
                            deviceTheme !== DeviceTheme.Light && setDeviceTheme(DeviceTheme.Light)
                        }
                    >
                        <Icons.Sun />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DeviceSettings;
