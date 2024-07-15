import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeftIcon, ArrowRightIcon, ReloadIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';

interface BrowserControlsProps {
    webviewRef: React.RefObject<Electron.WebviewTag>;
    webviewSrc: string;
    setWebviewSrc: React.Dispatch<React.SetStateAction<string>>;
    selected: boolean;
    hovered: boolean;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
}

function BrowserControls({
    webviewRef,
    webviewSrc,
    setWebviewSrc,
    selected,
    hovered,
    setHovered,
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
        </div>
    );
}

export default BrowserControls;
