import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckCircledIcon,
    ExclamationTriangleIcon,
    ExternalLinkIcon,
    ReloadIcon,
} from '@radix-ui/react-icons';
import clsx from 'clsx';
import { Links } from '/common/constants';

interface BrowserControlsProps {
    webviewRef: React.RefObject<Electron.WebviewTag>;
    webviewSrc: string;
    setWebviewSrc: React.Dispatch<React.SetStateAction<string>>;
    selected: boolean;
    hovered: boolean;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
    onlookEnabled: boolean;
}

function BrowserControls({
    webviewRef,
    webviewSrc,
    setWebviewSrc,
    selected,
    hovered,
    setHovered,
    onlookEnabled,
}: BrowserControlsProps) {
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

    function updateUrl(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter') {
            return;
        }

        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        const validUrl = getValidUrl(webviewSrc);
        webview.src = validUrl;
        webview.loadURL(validUrl);
        e.currentTarget.blur();
    }

    return (
        <div
            className={clsx(
                'flex flex-row items-center space-x-2 p-2 rounded-lg backdrop-blur-sm transition',
                selected ? ' bg-black/60 ' : '',
                hovered ? ' bg-black/20 ' : '',
            )}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
        >
            <Button variant="outline" className="bg-transparent" onClick={goBack}>
                <ArrowLeftIcon />
            </Button>
            <Button variant="outline" className="bg-transparent" onClick={goForward}>
                <ArrowRightIcon />
            </Button>
            <Button variant="outline" className="bg-transparent" onClick={reload}>
                <ReloadIcon />
            </Button>
            <Input
                className="text-xl"
                value={webviewSrc}
                onChange={(e) => setWebviewSrc(e.target.value)}
                onKeyDown={updateUrl}
            />
            <Popover>
                <PopoverTrigger>
                    <Button
                        variant="outline"
                        size="icon"
                        className={clsx(
                            onlookEnabled ? 'bg-transparent' : 'bg-red hover:bg-red-700',
                        )}
                    >
                        {onlookEnabled ? <CheckCircledIcon /> : <ExclamationTriangleIcon />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent>
                    <div className="space-y-2 text-sm flex flex-col">
                        {onlookEnabled ? (
                            <>
                                <p className="text-base">Onlook is enabled</p>
                                <p>Advanced features are available</p>
                            </>
                        ) : (
                            <>
                                <p className="text-base">Onlook is not enabled</p>
                                <p>
                                    {
                                        "You won't get advanced features like write-to-code, code inspect, etc."
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
                                    <ExternalLinkIcon className="ml-2" />
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
