import { Input } from '@/components/ui/input';
import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';
import { useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';
import { MainChannels } from '/common/constants';

function Webview({ messageBridge, metadata }: { messageBridge: WebviewMessageBridge, metadata: WebviewMetadata }) {
    const webviewRef = useRef(null);
    const editorEngine = useEditorEngine();
    const [webviewPreloadPath, setWebviewPreloadPath] = useState<string>('');
    const [webviewSrc, setWebviewSrc] = useState<string>(metadata.src);

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

    useEffect(() => {
        fetchPreloadPath();
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) return;

        editorEngine.webviews.register(webview);
        messageBridge.registerWebView(webview, metadata);
        return () => {
            editorEngine.webviews.deregister(webview);
            messageBridge.deregisterWebView(webview)
        };
    }, [webviewRef, webviewPreloadPath]);

    if (webviewPreloadPath)
        return (
            <div className='flex flex-col space-y-4'>
                <Input className='text-xl' value={webviewSrc} onChange={(e) => setWebviewSrc(e.target.value)} onKeyDown={updateUrl} />
                <webview
                    id={metadata.id}
                    ref={webviewRef}
                    className='w-[96rem] h-[70rem]'
                    src={metadata.src}
                    preload={`file://${webviewPreloadPath}`}
                    allowpopups={"true" as any}
                ></webview>
            </div>
        );
}

export default Webview;
