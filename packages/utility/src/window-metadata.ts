import { DEVICE_OPTIONS, Orientation, Theme } from '@onlook/constants';
import type { WindowMetadata } from '@onlook/models';

export const computeWindowMetadata = (width: string, height: string): WindowMetadata => {
    return {
        orientation: width > height ? Orientation.Landscape : Orientation.Portrait,
        aspectRatioLocked: true,
        device: computeDevice(width, height),
        theme: Theme.System,
        width: Number(width),
        height: Number(height),
    };
};

const computeDevice = (width: string, height: string): string => {
    let matchedDevice = 'Custom';

    for (const category in DEVICE_OPTIONS) {
        const devices = DEVICE_OPTIONS[category as keyof typeof DEVICE_OPTIONS];

        for (const deviceName in devices) {
            const resolution = devices[deviceName];
            if (typeof resolution === 'string') {
                const [w, h] = resolution.split('x').map(Number);
                if (w === Number(width) && h === Number(height)) {
                    matchedDevice = deviceName;
                    break;
                }
            }
        }

        if (matchedDevice !== 'Custom') break;
    }
    return matchedDevice;
};
