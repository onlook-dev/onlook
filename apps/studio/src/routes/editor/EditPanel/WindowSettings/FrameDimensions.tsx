import { useEditorEngine } from '@/components/Context';
import { DefaultSettings, Orientation } from '@onlook/models/constants';
import type { FrameSettings } from '@onlook/models/projects';
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
import { Fragment, useEffect, useState } from 'react';

type DeviceOptions = {
    [category: string]: {
        [deviceName: string]: string;
    };
};

const deviceOptions: DeviceOptions = {
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

const FrameDimensions = ({ settings }: { settings: FrameSettings }) => {
    const editorEngine = useEditorEngine();
    const [device, setDevice] = useState(settings.device || DefaultSettings.DEVICE);
    const [orientation, setOrientation] = useState(
        settings.orientation || DefaultSettings.ORIENTATION,
    );
    const [width, setWidth] = useState(
        settings.dimension.width || DefaultSettings.FRAME_DIMENSION.width,
    );
    const [height, setHeight] = useState(
        settings.dimension.height || DefaultSettings.FRAME_DIMENSION.height,
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

    useEffect(() => {
        const observer = (newSettings: FrameSettings) => {
            if (newSettings.dimension.width !== width) {
                setWidth(newSettings.dimension.width);
            }
            if (newSettings.dimension.height !== height) {
                setHeight(newSettings.dimension.height);
            }
        };

        editorEngine.canvas.observeSettings(settings.id, observer);

        return editorEngine.canvas.unobserveSettings(settings.id, observer);
    }, []);

    useEffect(() => {
        setDevice(settings.device || DefaultSettings.DEVICE);
        setOrientation(settings.orientation || DefaultSettings.ORIENTATION);
        setWidth(settings.dimension.width || DefaultSettings.FRAME_DIMENSION.width);
        setHeight(settings.dimension.height || DefaultSettings.FRAME_DIMENSION.height);
        setAspectRatioLocked(settings.aspectRatioLocked || DefaultSettings.ASPECT_RATIO_LOCKED);
    }, [settings.id]);

    useEffect(() => {
        const [deviceCategory, deviceName] = device.split(':');
        if (deviceName === 'Custom') {
            editorEngine.canvas.saveFrame(settings.id, {
                device: device,
            });
            return;
        }
        const [deviceWidth, deviceHeight] = deviceOptions[deviceCategory][deviceName].split('x');
        if (width === parseInt(deviceHeight) && height === parseInt(deviceWidth)) {
            return;
        } else {
            setWidth(parseInt(deviceWidth));
            setHeight(parseInt(deviceHeight));
            editorEngine.canvas.saveFrame(settings.id, {
                dimension: { width: parseInt(deviceWidth), height: parseInt(deviceHeight) },
                device: device,
            });
            if (aspectRatioLocked) {
                setAspectRatio(parseInt(deviceWidth) / parseInt(deviceHeight));
            }
        }
    }, [device]);

    useEffect(() => {
        const [deviceCategory, deviceName] = device.split(':');
        const [deviceWidth, deviceHeight] = deviceOptions[deviceCategory][deviceName].split('x');

        if (
            deviceName !== 'Custom' &&
            ((width !== parseInt(deviceWidth) && width !== parseInt(deviceHeight)) ||
                (height !== parseInt(deviceHeight) && height !== parseInt(deviceWidth)))
        ) {
            setDevice('Custom:Custom');
        }
        if (height > width && orientation !== Orientation.Potrait && !aspectRatioLocked) {
            setOrientation(Orientation.Potrait);
        }
        if (width > height && orientation !== Orientation.Landscape && !aspectRatioLocked) {
            setOrientation(Orientation.Landscape);
        }

        editorEngine.canvas.saveFrame(settings.id, {
            dimension: { width: width, height: height },
        });
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
        editorEngine.canvas.saveFrame(settings.id, {
            aspectRatioLocked: aspectRatioLocked,
        });
    }, [aspectRatioLocked]);

    useEffect(() => {
        editorEngine.canvas.saveFrame(settings.id, {
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
                orientation === Orientation.Landscape ? Orientation.Potrait : Orientation.Landscape,
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
        editorEngine.canvas.saveFrame(settings.id, {
            aspectRatioLocked: !aspectRatioLocked,
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <p className="text-smallPlus text-foreground-primary">Frame Dimensions</p>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Device</span>
                <Select value={device} onValueChange={setDevice}>
                    <SelectTrigger className="w-3/5 bg-background-secondary border-background-secondary py-1.5 px-2 h-fit text-xs rounded focus:outline-none focus:ring-0">
                        <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md bg-background-secondary">
                        {Object.entries(deviceOptions).map(([category, devices], index) =>
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
                                    {index < Object.entries(deviceOptions).length - 1 && (
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
                        className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${orientation === Orientation.Potrait ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={handleOrientationChange}
                    >
                        <Icons.Potrait
                            className={`h-4 w-4 ${orientation !== Orientation.Potrait ? 'text-foreground-secondary hover:text-foreground-onlook' : ''}`}
                        />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`h-full w-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${orientation === 'Landscape' ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
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
            {/* <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Responsive</span>
                <Select value={responsive} onValueChange={setResponsive}>
                    <SelectTrigger className="w-3/5 rounded bg-background-secondary border-background-secondary px-2 h-8 text-xs">
                        <SelectValue placeholder="Select size" defaultValue={'Closest Size'} />
                    </SelectTrigger>
                    <SelectContent className="rounded-md bg-background-secondary">
                        <SelectItem
                            value="Closest Size"
                            className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                        >
                            Closest Size
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div> */}
        </div>
    );
};

export default FrameDimensions;
