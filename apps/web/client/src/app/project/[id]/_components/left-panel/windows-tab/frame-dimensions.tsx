import { useEditorEngine } from '@/components/store/editor';
import type { FrameImpl } from '@/components/store/editor/canvas/frame';
import { DefaultSettings, DEVICE_OPTIONS, Orientation } from '@onlook/constants';
import type { FrameType, WindowMetadata } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@onlook/ui/select';
import { Separator } from '@onlook/ui/separator';
import { computeWindowMetadata } from '@onlook/utility';
import { Fragment, useEffect, useState } from 'react';

export const FrameDimensions = ({ frame }: { frame: FrameImpl }) => {
    const editorEngine = useEditorEngine();

    const settings = computeWindowMetadata(frame.dimension.width.toString(), frame.dimension.height.toString());
    const [device, setDevice] = useState(settings.device || DefaultSettings.DEVICE);
    const [orientation, setOrientation] = useState(
        settings.orientation || DefaultSettings.ORIENTATION,
    );
    const [width, setWidth] = useState(
        settings.width || DefaultSettings.FRAME_DIMENSION.width,
    );
    const [height, setHeight] = useState(
        settings.height || DefaultSettings.FRAME_DIMENSION.height,
    );
    // const [responsive, setResponsive] = useState('Closest Size');
    const [aspectRatioLocked, setAspectRatioLocked] = useState(
        settings.aspectRatioLocked || DefaultSettings.ASPECT_RATIO_LOCKED,
    );
    const [aspectRatio, setAspectRatio] = useState(width / height);
    const [step, setStep] = useState(1);
    const [minDimensionsAspectRatio, setMinDimensionsAspectRatio] = useState({
        height: parseInt(DefaultSettings.MIN_DIMENSIONS.height),
        width: parseInt(DefaultSettings.MIN_DIMENSIONS.width),
    });

    const updateFrame = (metadata: Partial<WindowMetadata>) => {
        console.log(metadata);
    }

    useEffect(() => {
        const [deviceCategory, deviceName] = device.split(':');
        if (deviceCategory && deviceName) {


            if (deviceName === 'Custom') {
                updateFrame({
                    device: device as FrameType,
                });
                return;
            }

            if (!DEVICE_OPTIONS[deviceCategory]?.[deviceName]) {
                setDevice('Custom:Custom');
                return;
            }

            const [deviceWidth, deviceHeight] = DEVICE_OPTIONS[deviceCategory][deviceName].split('x');
            if (deviceWidth && deviceHeight) {
                if (width === parseInt(deviceHeight) && height === parseInt(deviceWidth)) {
                    return;
                } else {
                    setWidth(parseInt(deviceWidth));
                    setHeight(parseInt(deviceHeight));
                    updateFrame({
                        width: parseInt(deviceWidth),
                        height: parseInt(deviceHeight),
                        device: device as FrameType,
                    });
                    if (aspectRatioLocked) {
                        setAspectRatio(parseInt(deviceWidth) / parseInt(deviceHeight));
                    }
                }
            }
        }
    }, [device]);

    useEffect(() => {
        const [deviceCategory, deviceName] = device.split(':');

        if (deviceCategory && deviceName) {
            if (!DEVICE_OPTIONS[deviceCategory]?.[deviceName]) {
                setDevice('Custom:Custom');
                return;
            }

            const [deviceWidth, deviceHeight] =
                DEVICE_OPTIONS[deviceCategory][deviceName].split('x');

            if (deviceWidth && deviceHeight) {
                if (
                    deviceName !== 'Custom' &&
                    ((width !== parseInt(deviceWidth) && width !== parseInt(deviceHeight)) ||
                        (height !== parseInt(deviceHeight) && height !== parseInt(deviceWidth)))
                ) {
                    setDevice('Custom:Custom');
                }
            }

            if (height > width && orientation !== Orientation.Portrait && !aspectRatioLocked) {
                setOrientation(Orientation.Portrait);
            }
            if (width > height && orientation !== Orientation.Landscape && !aspectRatioLocked) {
                setOrientation(Orientation.Landscape);
            }

            updateFrame({
                width: width,
                height: height,
            });
        }
    }, [height, width]);

    useEffect(() => {
        setAspectRatio(width / height);
        if (aspectRatioLocked) {
            setMinDimensionsAspectRatio({
                height: Math.max(
                    parseInt(DefaultSettings.MIN_DIMENSIONS.height),
                    Math.floor(parseInt(DefaultSettings.MIN_DIMENSIONS.width) / aspectRatio),
                ),
                width: Math.max(
                    parseInt(DefaultSettings.MIN_DIMENSIONS.width),
                    Math.floor(parseInt(DefaultSettings.MIN_DIMENSIONS.height) * aspectRatio),
                ),
            });
        } else {
            setMinDimensionsAspectRatio({
                height: parseInt(DefaultSettings.MIN_DIMENSIONS.height),
                width: parseInt(DefaultSettings.MIN_DIMENSIONS.width),
            });
        }
        updateFrame({
            aspectRatioLocked: aspectRatioLocked,
        });
    }, [aspectRatioLocked]);

    useEffect(() => {
        updateFrame({
            orientation: orientation,
        });
    }, [orientation]);

    const handleOrientationChange = () => {
        if (
            width >= parseInt(DefaultSettings.MIN_DIMENSIONS.width) &&
            height >= parseInt(DefaultSettings.MIN_DIMENSIONS.height)
        ) {
            setHeight(width);
            setWidth(height);
            setOrientation(
                orientation === Orientation.Landscape
                    ? Orientation.Portrait
                    : Orientation.Landscape,
            );
        }
    };

    const handleDimensionInput = (
        event: React.ChangeEvent<HTMLInputElement>,
        dimension: string,
    ) => {
        const value = event.target.value;
        if (dimension === 'width') {
            setWidth(parseInt(value));
            if (aspectRatioLocked) {
                setHeight(Math.floor(parseInt(value) / aspectRatio));
            }
        } else if (dimension === 'height') {
            setHeight(parseInt(value));
            if (aspectRatioLocked) {
                setWidth(Math.floor(parseInt(value) * aspectRatio));
            }
        }
    };

    const handleDimensionKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.shiftKey) {
            setStep(10);
        }
    };

    const handleDimensionKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.shiftKey) {
            setStep(1);
        }
    };

    const handleDimensionInputBlur = (
        event: React.FocusEvent<HTMLInputElement>,
        dimension: string,
    ) => {
        const value = event.target.value;
        if (dimension === 'width') {
            if (aspectRatioLocked) {
                if (
                    parseInt(value) / aspectRatio <
                    parseInt(DefaultSettings.MIN_DIMENSIONS.height) ||
                    parseInt(value) < parseInt(DefaultSettings.MIN_DIMENSIONS.width)
                ) {
                    const dimensionsAspectRatio =
                        aspectRatio >= 1
                            ? {
                                height: parseInt(DefaultSettings.MIN_DIMENSIONS.height),
                                width: Math.floor(
                                    parseInt(DefaultSettings.MIN_DIMENSIONS.height) * aspectRatio,
                                ),
                            }
                            : {
                                height: Math.floor(
                                    parseInt(DefaultSettings.MIN_DIMENSIONS.width) / aspectRatio,
                                ),
                                width: parseInt(DefaultSettings.MIN_DIMENSIONS.width),
                            };
                    setHeight(dimensionsAspectRatio.height);
                    setWidth(dimensionsAspectRatio.width);
                }
            } else if (parseInt(value) < parseInt(DefaultSettings.MIN_DIMENSIONS.width)) {
                event.target.value = parseInt(DefaultSettings.MIN_DIMENSIONS.width).toString();
                setWidth(parseInt(DefaultSettings.MIN_DIMENSIONS.width));
            }
        } else if (dimension === 'height') {
            if (aspectRatioLocked) {
                if (
                    parseInt(value) * aspectRatio <
                    parseInt(DefaultSettings.MIN_DIMENSIONS.width) ||
                    parseInt(value) < parseInt(DefaultSettings.MIN_DIMENSIONS.height)
                ) {
                    const dimensionsAspectRatio =
                        aspectRatio >= 1
                            ? {
                                height: parseInt(DefaultSettings.MIN_DIMENSIONS.height),
                                width: Math.floor(
                                    parseInt(DefaultSettings.MIN_DIMENSIONS.height) * aspectRatio,
                                ),
                            }
                            : {
                                height: Math.floor(
                                    parseInt(DefaultSettings.MIN_DIMENSIONS.width) / aspectRatio,
                                ),
                                width: parseInt(DefaultSettings.MIN_DIMENSIONS.width),
                            };
                    setHeight(dimensionsAspectRatio.height);
                    setWidth(dimensionsAspectRatio.width);
                }
            } else if (parseInt(value) < parseInt(DefaultSettings.MIN_DIMENSIONS.height)) {
                event.target.value = parseInt(DefaultSettings.MIN_DIMENSIONS.height).toString();
                setHeight(parseInt(DefaultSettings.MIN_DIMENSIONS.height));
            }
        }
    };

    const handleAspectRatioLock = () => {
        setAspectRatioLocked((prev) => !prev);
        updateFrame({
            aspectRatioLocked: !aspectRatioLocked,
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-foreground-primary">Frame Dimensions</p>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Device</span>
                <Select value={device} onValueChange={setDevice}>
                    <SelectTrigger className="w-3/5 bg-background-secondary border-background-secondary py-1.5 px-2 h-fit text-xs rounded focus:outline-none focus:ring-0">
                        <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md bg-background-secondary">
                        {Object.entries(DEVICE_OPTIONS).map(([category, devices], index) =>
                            category !== 'Custom' ? (
                                <Fragment key={index}>
                                    <SelectGroup key={index}>
                                        <SelectLabel>{category}</SelectLabel>
                                        {Object.entries(devices).map(([deviceName], index) => (
                                            <SelectItem
                                                key={index}
                                                value={category + ':' + deviceName}
                                                className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                                            >
                                                {deviceName}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                    {index < Object.entries(DEVICE_OPTIONS).length - 1 && (
                                        <Separator className="text-white" />
                                    )}
                                </Fragment>
                            ) : (
                                <SelectItem
                                    key={'Custom'}
                                    value={'Custom:Custom'}
                                    className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                                >
                                    {'Custom'}
                                </SelectItem>
                            ),
                        )}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Orientation</span>
                <div className="flex flex-row p-0.5 w-3/5 bg-background-secondary rounded">
                    <Button
                        size={'icon'}
                        className={`flex-1 h-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${orientation === Orientation.Portrait ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={handleOrientationChange}
                    >
                        <Icons.Portrait
                            className={`h-4 w-4 ${orientation !== Orientation.Portrait ? 'text-foreground-secondary hover:text-foreground-onlook' : ''}`}
                        />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`flex-1 h-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${orientation === 'Landscape' ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={handleOrientationChange}
                    >
                        <Icons.Landscape
                            className={`h-4 w-4 ${orientation !== Orientation.Landscape ? 'text-foreground-secondary hover:text-foreground-onlook' : ''}`}
                        />
                    </Button>
                </div>
            </div>
            <div className="flex flex-row justify-between items-center relative">
                <span className="text-xs text-foreground-secondary">Width</span>
                <Icons.CornerTopLeft
                    className="absolute h-4 w-4 text-foreground-quadranary top-3 left-16 cursor-pointer z-50"
                    onClick={handleAspectRatioLock}
                />
                {aspectRatioLocked ? (
                    <Icons.LockClosed
                        className="absolute h-3 w-3 text-foreground-primary top-[30px] left-[61.5px] cursor-pointer z-50"
                        onClick={handleAspectRatioLock}
                    />
                ) : (
                    <Icons.LockOpen
                        className="absolute h-3 w-3 text-foreground-primary top-[30px] left-[61.5px] cursor-pointer z-50"
                        onClick={handleAspectRatioLock}
                    />
                )}

                <div className="relative w-3/5">
                    <Input
                        className="w-full px-2 h-8 text-xs rounded border-none text-foreground-active bg-background-secondary text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={width}
                        min={minDimensionsAspectRatio.width}
                        type="number"
                        step={step}
                        onChange={(event) => handleDimensionInput(event, 'width')}
                        onKeyDown={(event) => handleDimensionKeyDown(event)}
                        onKeyUp={(event) => handleDimensionKeyUp(event)}
                        onBlur={(event) => handleDimensionInputBlur(event, 'width')}
                    />
                    <p className="p-0 h-fit w-fit absolute right-2 top-1/2 transform -translate-y-1/2 text-foreground-secondary text-xs">
                        px
                    </p>
                </div>
            </div>
            <div className="flex flex-row justify-between items-center relative">
                <span className="text-xs text-foreground-secondary">Height</span>
                <Icons.CornerBottomLeft
                    className="absolute h-4 w-4 text-foreground-quadranary bottom-3 left-16 cursor-pointer z-50"
                    onClick={() => setAspectRatioLocked((prev) => !prev)}
                />
                <div className="relative w-3/5">
                    <Input
                        className="w-full px-2 h-8 text-xs rounded border-none text-foreground-active bg-background-secondary text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={height}
                        min={minDimensionsAspectRatio.height}
                        type="number"
                        step={step}
                        onChange={(event) => handleDimensionInput(event, 'height')}
                        onKeyDown={(event) => handleDimensionKeyDown(event)}
                        onKeyUp={(event) => handleDimensionKeyUp(event)}
                        onBlur={(event) => handleDimensionInputBlur(event, 'height')}
                    />
                    <p className="p-0 h-fit w-fit absolute right-2 top-1/2 transform -translate-y-1/2 text-foreground-secondary text-xs">
                        px
                    </p>
                </div>
            </div>
        </div>
    );
};
