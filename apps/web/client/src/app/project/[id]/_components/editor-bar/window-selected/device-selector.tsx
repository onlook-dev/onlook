import { useEditorEngine } from '@/components/store/editor';
import { DEVICE_OPTIONS, Orientation } from '@onlook/constants';
import type { WindowMetadata } from '@onlook/models';
import { Icons } from '@onlook/ui/icons/index';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger } from '@onlook/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { computeWindowMetadata, getDeviceType } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';

const DeviceIcon = ({ deviceType, orientation }: { deviceType: string, orientation: Orientation }) => {
    switch (deviceType) {
        case 'Phone':
            return <Icons.Mobile className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />;
        case 'Desktop':
            return <Icons.Desktop className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />;
        case 'Laptop':
            return <Icons.Laptop className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />;
        case 'Tablet':
            return <Icons.Tablet className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />;
        default:
            return <CustomIcon orientation={orientation} />;
    }
};

const CustomIcon = ({ orientation }: { orientation: Orientation }) => {
    return orientation === Orientation.Landscape ? (
        <Icons.Landscape className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
    ) : (
        <Icons.Portrait className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
    );
};

export const DeviceSelector = observer(() => {
    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.selected[0];
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
            DEVICE_OPTIONS[category] &&
            DEVICE_OPTIONS[category][deviceName] &&
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
        <Select value={device} onValueChange={handleDeviceChange}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <SelectTrigger className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none">
                        <DeviceIcon deviceType={deviceType} orientation={metadata.orientation} />
                        <span className="font-medium">{deviceType}</span>
                    </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Device</TooltipContent>
            </Tooltip>
            <SelectContent>
                {Object.entries(DEVICE_OPTIONS).map(([category, devices]) => (
                    <SelectGroup key={category}>
                        <SelectLabel className="text-xs">{category}</SelectLabel>
                        {Object.entries(devices).map(([name, dimensions]) => (
                            <SelectItem
                                key={`${category}:${name}`}
                                value={`${category}:${name}`}
                                className="text-xs flex items-center"
                            >
                                <DeviceIcon deviceType={category} orientation={metadata.orientation} />
                                {name} ({dimensions})
                            </SelectItem>
                        ))}
                        <SelectSeparator />
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    );
}); 