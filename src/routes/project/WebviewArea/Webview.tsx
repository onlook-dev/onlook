import { Label } from '@/components/ui/label';
import { MainChannel } from '@/lib/constants';
import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';
import { useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';

function Webview({ messageBridge, metadata }: { messageBridge: WebviewMessageBridge, metadata: WebviewMetadata }) {
    const webviewRef = useRef(null);
    const editorEngine = useEditorEngine();

    const [webviewPreloadPath, setWebviewPreloadPath] = useState<string>('');
    const [webviewTitle, setWebviewTitle] = useState<string>(metadata.title);

    function fetchPreloadPath() {
        window.Main.invoke(MainChannel.WEBVIEW_PRELOAD_PATH).then((preloadPath: any) => {
            setWebviewPreloadPath(preloadPath);
        });
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
                <Label className='text-xl'>{webviewTitle}</Label>
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
