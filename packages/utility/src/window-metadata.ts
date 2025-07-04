import { DEVICE_OPTIONS, Orientation, Theme } from '@onlook/constants';
import type { WindowMetadata } from '@onlook/models';

export const computeWindowMetadata = (width: string, height: string): WindowMetadata => {
    const numericWidth = Number(width);
    const numericHeight = Number(height);

    return {
        orientation: numericWidth > numericHeight ? Orientation.Landscape : Orientation.Portrait,
        aspectRatioLocked: true,
        device: computeDevice(numericWidth, numericHeight),
        theme: Theme.System,
        width: numericWidth,
        height: numericHeight,
    };
};

const computeDevice = (width: number, height: number): string => {
    let matchedDevice = 'Custom';

    for (const category in DEVICE_OPTIONS) {
        const devices = DEVICE_OPTIONS[category as keyof typeof DEVICE_OPTIONS];

        for (const deviceName in devices) {
            const resolution = devices[deviceName];
            if (typeof resolution === 'string') {
                const [w, h] = resolution.split('x').map(Number);
                if (w === width && h === height) {
                    matchedDevice = deviceName;
                    break;
                }
            }
        }

        if (matchedDevice !== 'Custom') break;
    }
    return matchedDevice;
};

export const getDeviceType = (name: string): string => {
    if (name === 'Custom') {
        return 'Custom';
    }

    for (const category in DEVICE_OPTIONS) {
        const devices = DEVICE_OPTIONS[category as keyof typeof DEVICE_OPTIONS];

        if (devices && devices[name]) {
            switch (category) {
                case 'Phone':
                    return 'Phone';
                case 'Tablet':
                    return 'Tablet';
                case 'Laptop':
                    return 'Laptop';
                case 'Desktop':
                    return 'Desktop';
                case 'Custom':
                    return 'Custom';
                default:
                    return 'Custom';
            }
        }
    }

    return 'Custom';
};
