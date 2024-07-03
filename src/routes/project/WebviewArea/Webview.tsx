import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';
import { ArrowLeftIcon, ArrowRightIcon, ReloadIcon } from '@radix-ui/react-icons';
import { useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';
import { MainChannels } from '/common/constants';

function Webview({ messageBridge, metadata }: { messageBridge: WebviewMessageBridge, metadata: WebviewMetadata }) {
    const webviewRef = useRef(null);
    const editorEngine = useEditorEngine();
    const [webviewPreloadPath, setWebviewPreloadPath] = useState<string>('');
    const [webviewSrc, setWebviewSrc] = useState<string>(metadata.src);
    // TODO: Move this outside
    const [selectedWebview, selectWebview] = useState<string>('')

    function fetchPreloadPath() {
        window.Main.invoke(MainChannels.WEBVIEW_PRELOAD_PATH).then((preloadPath: any) => {
            setWebviewPreloadPath(preloadPath);
        });
    }

    function webviewSelected() {
        return selectedWebview === metadata.id;
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

    if (webviewPreloadPath)
        return (
            <div className='flex flex-col space-y-2'>
                <div className={`flex flex-row items-center space-x-2 p-2 rounded-lg backdrop-blur-sm  ${webviewSelected() ? ' bg-black/20 ' : ''}`}>
                    <Button variant='outline' onClick={goBack}><ArrowLeftIcon /></Button>
                    <Button variant='outline' onClick={goForward}><ArrowRightIcon /></Button>
                    <Button variant='outline' onClick={reload}><ReloadIcon /></Button>
                    <Input className='text-xl' value={webviewSrc} onChange={(e) => setWebviewSrc(e.target.value)} onKeyDown={updateUrl} />
                </div>
                <div className='relative'>
                    <webview
                        id={metadata.id}
                        ref={webviewRef}
                        className={`w-[96rem] h-[70rem] bg-black/10 backdrop-blur-sm`}
                        src={metadata.src}
                        preload={`file://${webviewPreloadPath}`}
                        allowpopups={"true" as any}
                    ></webview>
                    {!webviewSelected() && (<div className='absolute inset-0 bg-transparent hover:ring-2 ring-red-900' onClick={() => selectWebview(metadata.id)}></div>)}
                </div>
            </div>
        );
}

export default Webview;
