import { WebviewMetadata } from '@/lib/models';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { MainChannels } from '/common/constants';

interface WebviewTagProps {
    metadata: WebviewMetadata;
    webviewRef: React.RefObject<Electron.WebviewTag>;
    selected: boolean;
}

function WebviewTag({ metadata, webviewRef, selected }: WebviewTagProps) {
    const [webviewPreloadPath, setWebviewPreloadPath] = useState<string>('');

    function fetchPreloadPath() {
        window.Main.invoke(MainChannels.WEBVIEW_PRELOAD_PATH).then((preloadPath: any) => {
            setWebviewPreloadPath(preloadPath);
        });
    }

    useEffect(() => {
        fetchPreloadPath();
    }, []);

    return (
        webviewPreloadPath && (
            <webview
                id={metadata.id}
                ref={webviewRef}
                className={clsx(
                    'w-[96rem] h-[60rem] bg-black/10 backdrop-blur-sm transition',
                    selected ? 'ring-2 ring-red-900' : '',
                )}
                src={metadata.src}
                preload={`file://${webviewPreloadPath}`}
                allowpopups={'true' as any}
            ></webview>
        )
    );
}

export default WebviewTag;
