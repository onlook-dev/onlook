import { type IconProps, Icons } from '@onlook/ui/icons';

export interface SizePreset {
    name: string;
    width: number;
    height: number;
    icon: React.FC<IconProps>;
}

export const SIZE_PRESETS: SizePreset[] = [
    { name: 'Desktop', width: 1440, height: 1024, icon: Icons.Desktop },
    { name: 'Laptop', width: 1280, height: 832, icon: Icons.Laptop },
    { name: 'Mobile', width: 320, height: 568, icon: Icons.Mobile },
];
