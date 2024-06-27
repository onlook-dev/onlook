import { MainChannel } from '@/lib/constants';
import { ipcMessageHandler } from '@/lib/editor';
import { useEffect, useRef, useState } from 'react';

function FrameList() {
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
                ref={ref}
                className='w-[96rem] h-[54rem]'
                src="https://www.framer.com/"
                preload={`file://${webviewPreloadPath}`}
                allowpopups={"true" as any}
            ></webview>
        );
}

export default FrameList;
