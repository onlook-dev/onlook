import { ipcMessageHandler } from '@/lib/browserview';
import { MainChannel } from '@/lib/constants';
import { WebviewMetadata } from '@/lib/webview/models';
import { useEffect, useRef, useState } from 'react';

// TODO: Manage multiple web views
function Webview({ metadata }: { metadata: WebviewMetadata }) {
    const ref = useRef(null);
    const [webviewPreloadPath, setWebviewPreloadPath] = useState<string>('');

    function setWebviewHandlers(): (() => void)[] {
        const handlerRemovers: (() => void)[] = [];
        const webview = ref.current as Electron.WebviewTag | null;
        if (!webview)
            return handlerRemovers;

        webview.addEventListener('ipc-message', ipcMessageHandler);
        handlerRemovers.push(() => {
            webview.removeEventListener('ipc-message', ipcMessageHandler);
        });
        return handlerRemovers;
    }

    useEffect(() => {
        window.Main.invoke(MainChannel.WEBVIEW_PRELOAD_PATH).then((preloadPath: any) => {
            setWebviewPreloadPath(preloadPath);
        });

        const handlerRemovers = setWebviewHandlers();
        return () => {
            handlerRemovers.forEach((handlerRemover) => {
                handlerRemover();
            });
        };
    }, [ref, webviewPreloadPath]);

    if (webviewPreloadPath)
        return (
            <webview
                id={metadata.id}
                ref={ref}
                className='w-[96rem] h-[54rem]'
                src={metadata.src}
                preload={`file://${webviewPreloadPath}`}
                allowpopups={"true" as any}
            ></webview>
        );
}

export default Webview;
