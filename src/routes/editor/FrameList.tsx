import { MainChannel } from '@/lib/constants';
import { useEffect, useRef, useState } from 'react';

function FrameList() {
    const ref = useRef(null);
    const [webviewPreloadPath, setWebviewPreloadPath] = useState<string>('');

    useEffect(() => {
        window.Main.invoke(MainChannel.WEBVIEW_PRELOAD_PATH).then((preloadPath: any) => {
            setWebviewPreloadPath(preloadPath);
        });

        if (!ref.current) {
            return;
        }
        const webview = ref.current as Electron.WebviewTag;
        const handlerRemovers: (() => void)[] = [];

        webview.addEventListener('dom-ready', () => {
            console.log('dom-ready');
        });

        const ipcMessageHandler = (e: Electron.IpcMessageEvent) => {
            console.log("🚀 ~ ipcMessageHandler ~ e.channel:", e.channel)
        };

        webview.addEventListener('ipc-message', ipcMessageHandler);
        handlerRemovers.push(() => {
            webview.removeEventListener('ipc-message', ipcMessageHandler);
        });

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
