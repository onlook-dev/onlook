import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Links } from '/common/constants';
import { Icons } from '@/components/icons';

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
}

interface SizePreset {
    name: string;
    width: number;
    height: number;
    icon: React.ReactNode;
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
}: BrowserControlsProps) {
    const [urlInputValue, setUrlInputValue] = useState(webviewSrc);
    const [selectedPreset, setSelectedPreset] = useState<string>('Desktop');
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const PRESETS: SizePreset[] = [
        { name: 'Desktop', width: 1440, height: 1024, icon: <Icons.Desktop /> },
        { name: 'Laptop', width: 1280, height: 832, icon: <Icons.Laptop /> },
        { name: 'Mobile', width: 320, height: 568, icon: <Icons.Mobile /> },
    ];

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

    function resizeToPreset(width: number, height: number, presetName: string) {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (webview) {
            setWebviewSize({ width, height });
            setSelectedPreset(presetName);
            setIsPopoverOpen(false);
        }
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
                <Icons.Reload />
            </Button>
            <Input
                className="text-regularPlus bg-background-secondary/60"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={handleKeydown}
                onBlur={handleBlur}
            />
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
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
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() =>
                                    resizeToPreset(preset.width, preset.height, preset.name)
                                }
                                className={clsx(
                                    'w-full flex flex-row gap-2 px-3 py-3 transition-colors duration-200 items-center',
                                    selectedPreset === preset.name
                                        ? 'bg-background-tertiary text-foreground-primary'
                                        : 'bg-transparent text-foreground-secondary',
                                    'hover:bg-background-tertiary/50 hover:text-foreground-primary',
                                )}
                            >
                                {preset.icon}
                                <span className="justify-self-start text-smallPlus">
                                    {preset.name}
                                </span>
                                <span className="text-foreground-tertiary text-mini">{`${preset.width} × ${preset.height}`}</span>
                            </button>
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
                                <div className="flex gap-2 width-full justify-center">
                                    <p className="text-active text-largePlus">Onlook is enabled</p>
                                    <Icons.CheckCircled className="mt-[3px] text-foreground-positive" />
                                </div>
                                <p className="text-foreground-onlook text-regular">
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
        </div>
    );
}

export default BrowserControls;
