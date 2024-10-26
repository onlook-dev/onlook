import { IconProps, Icons } from '@/components/icons';

export interface SizePreset {
    name: string;
    type: 'desktop' | 'laptop' | 'mobile';
    width: number;
    height: number;
    icon: React.FC<IconProps>;
}

export const SIZE_PRESETS: SizePreset[] = [
    { name: 'Desktop', type: 'desktop', width: 1440, height: 1024, icon: Icons.Desktop },
    { name: 'Laptop', type: 'laptop', width: 1280, height: 832, icon: Icons.Laptop },
    { name: 'Mobile', type: 'mobile', width: 320, height: 568, icon: Icons.Mobile },
];
