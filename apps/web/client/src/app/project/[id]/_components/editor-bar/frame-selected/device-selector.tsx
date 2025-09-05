import { useEditorEngine } from '@/components/store/editor';
import { DEVICE_OPTIONS, Orientation } from '@onlook/constants';
import type { WindowMetadata } from '@onlook/models';
import { Icons } from '@onlook/ui/icons/index';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger } from '@onlook/ui/select';
import { cn } from '@onlook/ui/utils';
import { computeWindowMetadata, getDeviceType } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { HoverOnlyTooltip } from '../hover-tooltip';

const DeviceIcon = ({ deviceType, orientation, className }: { deviceType: string, orientation: Orientation, className?: string }) => {
    const iconClassName = `h-3.5 w-3.5 min-h-3.5 min-w-3.5 ${className || ''}`;
    switch (deviceType) {
        case 'Phone':
            return <Icons.Mobile className={iconClassName} />;
        case 'Desktop':
            return <Icons.Desktop className={iconClassName} />;
        case 'Laptop':
            return <Icons.Laptop className={iconClassName} />;
        case 'Tablet':
            return <Icons.Tablet className={iconClassName} />;
        default:
            return <CustomIcon orientation={orientation} className={className} />;
    }
};

const CustomIcon = ({ orientation, className }: { orientation: Orientation, className?: string }) => {
    const iconClassName = `h-3.5 w-3.5 min-h-3.5 min-w-3.5 ${className || ''}`;
    return orientation === Orientation.Landscape ? (
        <Icons.Landscape className={iconClassName} />
    ) : (
        <Icons.Portrait className={iconClassName} />
    );
};

export const DeviceSelector = observer(() => {
    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.selected[0];
    const [isOpen, setIsOpen] = useState(false);
    const [metadata, setMetadata] = useState<WindowMetadata>(() =>
        computeWindowMetadata(
            frameData?.frame.dimension.width.toString() ?? '0',
            frameData?.frame.dimension.height.toString() ?? '0'
        )
    );

    useEffect(() => {
        setMetadata(computeWindowMetadata(frameData?.frame.dimension.width.toString() ?? '0', frameData?.frame.dimension.height.toString() ?? '0'));
    }, [frameData?.frame.dimension.width, frameData?.frame.dimension.height]);

    if (!frameData) return null;

    const deviceType = useMemo(() => getDeviceType(metadata.device), [metadata.device]);

    const [device, setDevice] = useState(() => {
        for (const category in DEVICE_OPTIONS) {
            for (const deviceName in DEVICE_OPTIONS[category]) {
                const res = DEVICE_OPTIONS[category][deviceName];
                if (res === `${metadata.width}x${metadata.height}`) {
                    return `${category}:${deviceName}`;
                }
            }
        }
        return 'Custom:Custom';
    });

    const handleDeviceChange = (value: string) => {
        setDevice(value);
        const [category, deviceName] = value.split(':');
        if (
            category &&
            deviceName &&
            DEVICE_OPTIONS[category]?.[deviceName] &&
            deviceName !== 'Custom'
        ) {
            const [w, h] = DEVICE_OPTIONS[category][deviceName].split('x').map(Number);
            if (typeof w === 'number' && !isNaN(w) && typeof h === 'number' && !isNaN(h)) {

                const roundedWidth = Math.round(w);
                const roundedHeight = Math.round(h);
                editorEngine.frames.updateAndSaveToStorage(frameData.frame.id, { dimension: { width: roundedWidth, height: roundedHeight } });
            }
        }
    };

    return (
        <Select value={device} onValueChange={handleDeviceChange} onOpenChange={setIsOpen}>
            <HoverOnlyTooltip content="Device" side="bottom" sideOffset={10} disabled={isOpen}>
                <SelectTrigger className="flex items-center gap-2 text-muted-foreground dark:bg-transparent border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none">
                    <DeviceIcon deviceType={deviceType} orientation={metadata.orientation} />
                    <span className="text-smallPlus">{deviceType}</span>
                </SelectTrigger>
            </HoverOnlyTooltip>
            <SelectContent>
                {Object.entries(DEVICE_OPTIONS).map(([category, devices]) => (
                    <SelectGroup key={category}>
                        <SelectLabel className="text-xs">{category}</SelectLabel>
                        {Object.entries(devices).map(([name, dimensions]) => (
                            <SelectItem
                                key={`${category}:${name}`}
                                value={`${category}:${name}`}
                                className={cn(
                                    'text-xs flex items-center cursor-pointer',
                                    device === `${category}:${name}` && 'bg-background-tertiary/50 text-foreground-primary'
                                )}
                            >
                                <DeviceIcon deviceType={category} orientation={metadata.orientation} className={`${device === `${category}:${name}` ? 'text-foreground-primary' : 'text-foreground-onlook'}`} />
                                {name} <span className={`text-micro ${device === `${category}:${name}` ? 'text-foreground-primary' : 'text-foreground-tertiary'}`}>{dimensions.replace('x', '×')}</span>
                            </SelectItem>
                        ))}
                        <SelectSeparator />
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    );
}); 