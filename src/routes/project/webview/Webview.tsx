import { Label } from '@/components/ui/label';
import { MainChannel } from '@/lib/constants';
import { EditorManager } from '@/lib/editor';
import { WebviewMetadata } from '@/lib/models';
import { useEffect, useRef, useState } from 'react';

function Webview({ webviewManager, metadata }: { webviewManager: EditorManager, metadata: WebviewMetadata }) {
    const webviewRef = useRef(null);
    const [webviewPreloadPath, setWebviewPreloadPath] = useState<string>('');

    function fetchPreloadPath() {
        window.Main.invoke(MainChannel.WEBVIEW_PRELOAD_PATH).then((preloadPath: any) => {
            setWebviewPreloadPath(preloadPath);
        });
    }

    useEffect(() => {
        fetchPreloadPath();
        const webview = webviewRef?.current;
        if (!webview) return;

        webviewManager.registerWebView(webview, metadata);
        return () => webviewManager.deregisterWebView(webview);
    }, [webviewRef, webviewPreloadPath]);

    if (webviewPreloadPath)
        return (
            <div className='flex flex-col space-y-4'>
                <Label className='text-xl'>{metadata.title}</Label>
                <webview
                    id={metadata.id}
                    ref={webviewRef}
                    className='w-[96rem] h-[54rem]'
                    src={metadata.src}
                    preload={`file://${webviewPreloadPath}`}
                    allowpopups={"true" as any}
                ></webview>
            </div>
        );
}

export default Webview;
