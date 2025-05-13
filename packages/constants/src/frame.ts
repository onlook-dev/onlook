export enum Orientation {
    Portrait = 'Portrait',
    Landscape = 'Landscape',
}

export enum Theme {
    Light = 'light',
    Dark = 'dark',
    System = 'system',
}

type DeviceOptions = Record<string, Record<string, string>>;

export const DEVICE_OPTIONS: DeviceOptions = {
    Custom: {
        Custom: 'Custom',
    },
    Phone: {
        'Android Compact': '412x917',
        'Android Medium': '700x840',
        'Android Small': '360x640',
        'Android Large': '360x800',
        'iPhone 16': '393x852',
        'iPhone 16 Pro': '402x874',
        'iPhone 16 Pro Max': '440x956',
        'iPhone 16 Plus': '430x932',
        'iPhone 14 & 15 Pro': '430x932',
        'iPhone 14 & 15': '393x852',
        'iPhone 13 & 14': '390x844',
        'iPhone 13 Pro Max': '428x926',
        'iPhone 13 / 13 Pro': '390x844',
        'iPhone 11 Pro Max': '414x896',
        'iPhone 11 Pro / X': '375x812',
        'iPhone 8 Plus': '414x736',
        'iPhone 8': '375x667',
        'iPhone SE': '320x568',
    },
    Tablet: {
        'Android Expanded': '1280x800',
        'Surface Pro 8': '1440x960',
        'Surface Pro 4': '1368x912',
        'iPad Mini 8.3': '744x1133',
        'iPad Mini 5': '768x1024',
        'iPad Pro 11': '834x1194',
        'iPad Pro 12.9': '1024x1366',
    },
    Laptop: {
        'MacBook Air': '1280x832',
        MacBook: '1152x700',
        'MacBook Pro 14': '1512x982',
        'MacBook Pro 16': '1728x1117',
        'MacBook Pro': '1440x900',
        'Surface Book': '1500x1000',
    },
    Desktop: {
        Desktop: '1440x1024',
        Wireframe: '1440x1024',
        TV: '1280x720',
        iMac: '1280x720',
    },
};
