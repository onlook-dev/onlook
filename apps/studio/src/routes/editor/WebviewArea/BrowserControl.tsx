import { useEditorEngine } from '@/components/Context';
import { SIZE_PRESETS, type SizePreset } from '@/lib/sizePresets';
import { Links } from '@onlook/models/constants';
import type { FrameSettings } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import clsx from 'clsx';
import { useAnimate } from 'framer-motion';
import { nanoid } from 'nanoid';
import { useEffect, useState } from 'react';

interface BrowserControlsProps {
    webviewRef: React.RefObject<Electron.WebviewTag> | null;
    webviewSrc: string;
    setWebviewSrc: React.Dispatch<React.SetStateAction<string>>;
    setWebviewSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
    selected: boolean;
    hovered: boolean;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
    darkmode: boolean;
    setDarkmode: React.Dispatch<React.SetStateAction<boolean>>;
    onlookEnabled: boolean;
    selectedPreset: SizePreset | null;
    setSelectedPreset: React.Dispatch<React.SetStateAction<SizePreset | null>>;
    lockedPreset: SizePreset | null;
    setLockedPreset: React.Dispatch<React.SetStateAction<SizePreset | null>>;
    settings: FrameSettings;
}

function BrowserControls({
    webviewRef,
    webviewSrc,
    setWebviewSrc,
    setWebviewSize,
    selected,
    hovered,
    setHovered,
    darkmode,
    setDarkmode,
    onlookEnabled,
    selectedPreset,
    setSelectedPreset,
    lockedPreset,
    setLockedPreset,
    settings,
}: BrowserControlsProps) {
    const editorEngine = useEditorEngine();
    const [urlInputValue, setUrlInputValue] = useState(webviewSrc);
    const [isPresetPopoverOpen, setIsPresetPopoverOpen] = useState(false);
    const [scopeReload, animateReload] = useAnimate();

    useEffect(() => {
        setUrlInputValue(webviewSrc);
    }, [webviewSrc]);

    function goForward() {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }
        if (webview.canGoForward()) {
            webview.goForward();
        }
    }

    function reload() {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        webview.reload();
        animateReload(
            scopeReload.current,
            { rotate: 360, scale: 0.9 },
            {
                ease: 'easeInOut',
                duration: 0.4,
                onComplete() {
                    animateReload(scopeReload.current, { rotate: 0, scale: 1 }, { duration: 0 });
                },
            },
        );
    }

    function goBack() {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }
        if (webview.canGoBack()) {
            webview.goBack();
        }
    }

    function getValidUrl(url: string) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return 'http://' + url;
        }
        return url;
    }

    function handleKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
            return;
        }
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        const validUrl = getValidUrl(e.currentTarget.value);
        webview.src = validUrl;
        webview.loadURL(validUrl);
        setWebviewSrc(validUrl);
    }

    function toggleTheme() {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        webview.executeJavaScript(`window.api?.toggleTheme()`).then((res) => setDarkmode(res));
    }

    function resizeToPreset(preset: SizePreset) {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (webview) {
            setWebviewSize({ width: preset.width, height: preset.height });
            setSelectedPreset(preset);
        }
    }

    function handlePresetLock(preset: SizePreset | null) {
        if (lockedPreset) {
            setLockedPreset(null);
            return;
        }
        setLockedPreset(preset);
    }

    function canGoBack() {
        try {
            return webviewRef?.current?.canGoBack();
        } catch (e) {
            return false;
        }
    }

    function canGoForward() {
        try {
            return webviewRef?.current?.canGoForward();
        } catch (e) {
            return false;
        }
    }

    function duplicateWindow(linked: boolean = false) {
        const currentFrame = settings;
        const newFrame: FrameSettings = {
            id: nanoid(),
            url: currentFrame.url,
            dimension: {
                width: currentFrame.dimension.width,
                height: currentFrame.dimension.height,
            },
            position: currentFrame.position,
            duplicate: true,
            linkedIds: linked ? [currentFrame.id] : [],
        };

        if (linked) {
            currentFrame.linkedIds = [...(currentFrame.linkedIds || []), newFrame.id];
            editorEngine.canvas.saveFrame(currentFrame.id, {
                linkedIds: currentFrame.linkedIds,
            });
        }

        editorEngine.canvas.saveFrame(newFrame.id, {
            url: newFrame.url,
            dimension: newFrame.dimension,
        });

        editorEngine.canvas.frames = [...editorEngine.canvas.frames, newFrame];
    }

    function deleteDuplicateWindow() {
        editorEngine.canvas.frames = editorEngine.canvas.frames.filter(
            (frame) => frame.id !== settings.id,
        );

        editorEngine.canvas.frames.forEach((frame) => {
            frame.linkedIds = frame.linkedIds?.filter((id) => id !== settings.id);
        });
    }

    const PresetLockButton = ({ preset }: { preset: SizePreset | null }) => {
        return (
            <Button
                disabled={selectedPreset !== preset}
                size={'icon'}
                variant={'ghost'}
                className={cn(
                    'absolute right-0 top-1/2 -translate-y-1/2 hover:bg-transparent active:bg-transparent',
                    !lockedPreset && 'text-foreground-tertiary',
                    selectedPreset !== preset && 'hidden',
                )}
                onClick={() => handlePresetLock(preset)}
            >
                {lockedPreset ? <Icons.LockClosed /> : <Icons.LockOpen />}
            </Button>
        );
    };

    function renderDuplicateButton() {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        className="bg-background-secondary/60 flex items-center space-x-1 py-3"
                        size="icon"
                        onClick={() => duplicateWindow(true)}
                    >
                        <Icons.Plus />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicate Window</TooltipContent>
            </Tooltip>
        );
    }

    return (
        <div
            className={clsx(
                'flex flex-row items-center space-x-2 p-2 rounded-lg backdrop-blur-sm transition',
                selected ? ' bg-active/60 ' : '',
                hovered ? ' bg-hover/20 ' : '',
            )}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
        >
            <Button
                variant="outline"
                className="bg-background-secondary/60 px-3"
                onClick={goBack}
                disabled={!canGoBack()}
            >
                <Icons.ArrowLeft />
            </Button>
            <Button
                variant="outline"
                className="bg-background-secondary/60 px-3"
                onClick={goForward}
                disabled={!canGoForward()}
            >
                <Icons.ArrowRight />
            </Button>
            <Button variant="outline" className="bg-background-secondary/60 px-3" onClick={reload}>
                <Icons.Reload ref={scopeReload} />
            </Button>
            <div className="relative w-full items-center flex flex-row">
                <Input
                    className="text-regularPlus bg-background-secondary/60 w-full"
                    value={urlInputValue}
                    onChange={(e) => setUrlInputValue(e.target.value)}
                    onKeyDown={handleKeydown}
                    onBlur={handleBlur}
                />
                {settings.linkedIds && settings.linkedIds.length > 0 && (
                    <Icons.Link className="text-foreground-secondary absolute right-3" />
                )}
            </div>

            <Popover open={isPresetPopoverOpen} onOpenChange={setIsPresetPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="bg-background-secondary/60 flex items-center space-x-1 p-3"
                        size="default"
                    >
                        <Icons.Desktop />
                        <Icons.ChevronDown />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="backdrop-blur text-sm overflow-hidden bg-background/85 rounded-xl w-48 border p-0">
                    <h3 className="text-foreground-tertiary px-3 py-3 border-b text-smallPlus">
                        Preset Dimensions
                    </h3>
                    <div>
                        {SIZE_PRESETS.map((preset) => (
                            <div key={preset.name} className="relative">
                                <button
                                    onClick={() => resizeToPreset(preset)}
                                    className={clsx(
                                        'w-full flex flex-row gap-2 px-3 py-3 transition-colors duration-200 items-center',
                                        selectedPreset === preset
                                            ? 'bg-background-tertiary text-foreground-primary'
                                            : 'bg-transparent text-foreground-secondary',
                                        'hover:bg-background-tertiary/50 hover:text-foreground-primary',
                                        {
                                            'cursor-not-allowed':
                                                lockedPreset && lockedPreset !== preset,
                                        },
                                    )}
                                    disabled={!!lockedPreset && lockedPreset !== preset}
                                >
                                    <preset.icon />
                                    <span className="justify-self-start text-smallPlus">
                                        {preset.name}
                                    </span>
                                    <span className="text-foreground-tertiary text-mini">{`${preset.width} × ${preset.height}`}</span>
                                </button>
                                <PresetLockButton preset={preset} />
                            </div>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
            <Button
                variant="outline"
                className="bg-background-secondary/60"
                size="icon"
                onClick={toggleTheme}
            >
                {darkmode ? <Icons.Moon /> : <Icons.Sun />}
            </Button>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className={clsx(
                            onlookEnabled
                                ? 'bg-background-secondary/60'
                                : 'bg-red-500 hover:bg-red-700',
                        )}
                    >
                        {onlookEnabled ? <Icons.CheckCircled /> : <Icons.ExclamationTriangle />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent>
                    <div className="space-y-2 flex flex-col">
                        {onlookEnabled ? (
                            <>
                                <div className="flex gap-2 w-full justify-center">
                                    <p className="text-active text-largePlus">Onlook is enabled</p>
                                    <Icons.CheckCircled className="mt-[3px] text-foreground-positive" />
                                </div>
                                <p className="text-foreground-onlook text-regular w-80 text-wrap">
                                    Your codebase is now linked to the editor, giving you advanced
                                    features like write-to-code, component detection, code inspect,
                                    and more
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="flex gap-2 width-full justify-center">
                                    <p className="text-active text-largePlus">
                                        Onlook is not enabled
                                    </p>
                                    <Icons.CircleBackslash className="mt-[3px] text-red-500" />
                                </div>
                                <p className="text-foreground-onlook text-regular">
                                    {
                                        "You won't get advanced features like write-to-code, component detection, code inspect, and more."
                                    }
                                </p>
                                <Button
                                    className="mx-auto"
                                    variant="outline"
                                    onClick={() => {
                                        window.open(Links.USAGE_DOCS, '_blank');
                                    }}
                                >
                                    Learn how to enable
                                    <Icons.ExternalLink className="ml-2" />
                                </Button>
                            </>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
            {renderDuplicateButton()}
            {settings.duplicate && (
                <Button
                    variant="outline"
                    className="bg-background-secondary/60"
                    size="icon"
                    onClick={deleteDuplicateWindow}
                >
                    <Icons.Trash />
                </Button>
            )}
        </div>
    );
}

export default BrowserControls;
