import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';
import { ArrowLeftIcon, ArrowRightIcon, ReloadIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';
import { MainChannels } from '/common/constants';

const Webview = observer(({ messageBridge, metadata }: { messageBridge: WebviewMessageBridge, metadata: WebviewMetadata }) => {
    const webviewRef = useRef(null);
    const editorEngine = useEditorEngine();
    const [webviewPreloadPath, setWebviewPreloadPath] = useState<string>('');
    const [webviewSrc, setWebviewSrc] = useState<string>(metadata.src);
    const [selected, setSelected] = useState<boolean>();
    const [hovered, setHovered] = useState<boolean>();

    function fetchPreloadPath() {
        window.Main.invoke(MainChannels.WEBVIEW_PRELOAD_PATH).then((preloadPath: any) => {
            setWebviewPreloadPath(preloadPath);
        });
    }

    function updateUrl(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter') return;

        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) return;
        webview.src = webviewSrc;
        webview.loadURL(webviewSrc);
        e.currentTarget.blur();
    }

    function handleUrlChange(e: any) {
        setWebviewSrc(e.url);
        editorEngine.clear();
    }

    function goBack() {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) return;
        if (webview.canGoBack())
            webview.goBack();
    }

    function goForward() {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) return;
        if (webview.canGoForward())
            webview.goForward();
    }

    function reload() {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) return;
        webview.reload();
    }

    function overlayClicked(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();

        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) return;
        editorEngine.webviews.deselectAll();
        editorEngine.webviews.select(webview);
        editorEngine.webviews.notify();
    }

    useEffect(() => {
        fetchPreloadPath();
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) return;

        editorEngine.webviews.register(webview);
        messageBridge.registerWebView(webview, metadata);
        webview.addEventListener('did-navigate', handleUrlChange);

        return () => {
            editorEngine.webviews.deregister(webview);
            messageBridge.deregisterWebView(webview)
            webview.removeEventListener('did-navigate', handleUrlChange);
        };
    }, [webviewRef, webviewPreloadPath]);

    useEffect(() => {
        setSelected(editorEngine.webviews.isSelected(metadata.id));
    }, [editorEngine.webviews.webviews]);

    if (webviewPreloadPath)
        return (
            <div className='relative'>
                <div className='flex flex-col space-y-4'>
                    <div className={`flex flex-row items-center space-x-2 p-2 rounded-lg backdrop-blur-sm transition ${selected ? ' bg-black/60 ' : ''} ${hovered ? ' bg-black/20 ' : ''}`}>
                        <Button variant='outline' className="bg-transparent" onClick={goBack}><ArrowLeftIcon /></Button>
                        <Button variant='outline' className="bg-transparent" onClick={goForward}><ArrowRightIcon /></Button>
                        <Button variant='outline' className="bg-transparent" onClick={reload}><ReloadIcon /></Button>
                        <Input className='text-xl' value={webviewSrc} onChange={(e) => setWebviewSrc(e.target.value)} onKeyDown={updateUrl} />
                    </div>
                    <webview
                        id={metadata.id}
                        ref={webviewRef}
                        className={`w-[96rem] h-[60rem] bg-black/10 backdrop-blur-sm transition ${selected ? 'ring-2 ring-red-900' : ''}`}
                        src={metadata.src}
                        preload={`file://${webviewPreloadPath}`}
                        allowpopups={"true" as any}
                    ></webview>
                </div>
                {!selected && (<div className='absolute inset-0 bg-transparent' onClick={overlayClicked} onMouseOver={() => { setHovered(true) }} onMouseOut={() => { setHovered(false) }}></div>)}
            </div>
        );
})

export default Webview;
