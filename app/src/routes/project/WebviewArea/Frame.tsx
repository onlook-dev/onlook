import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';

import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';
import BrowserControls from './BrowserControl';
import GestureScreen from './GestureScreen';
import WebviewTag from './WebViewTag';

const Webview = observer(
    ({
        messageBridge,
        metadata,
    }: {
        messageBridge: WebviewMessageBridge;
        metadata: WebviewMetadata;
    }) => {
        const webviewRef = useRef(null);
        const editorEngine = useEditorEngine();
        const [webviewSrc, setWebviewSrc] = useState<string>(metadata.src);
        const [selected, setSelected] = useState<boolean>(false);
        const [hovered, setHovered] = useState<boolean>(false);

        function handleUrlChange(e: any) {
            setWebviewSrc(e.url);
            editorEngine.clear();
        }

        async function handleDomReady() {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }

            const htmlString = await webview.executeJavaScript(
                'document.documentElement.outerHTML',
            );
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const rootNode = doc.body;
            editorEngine.webviews.setDom(metadata.id, rootNode);
        }

        useEffect(() => {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }

            editorEngine.webviews.register(webview);
            messageBridge.registerWebView(webview, metadata);
            webview.addEventListener('did-navigate', handleUrlChange);
            webview.addEventListener('dom-ready', handleDomReady);

            return () => {
                editorEngine.webviews.deregister(webview);
                messageBridge.deregisterWebView(webview);
                webview.removeEventListener('did-navigate', handleUrlChange);
            };
        }, [webviewRef]);

        useEffect(() => {
            setSelected(editorEngine.webviews.isSelected(metadata.id));
        }, [editorEngine.webviews.webviews]);

        return (
            <div className="relative">
                <div className="flex flex-col space-y-4">
                    <BrowserControls
                        webviewRef={webviewRef}
                        webviewSrc={webviewSrc}
                        setWebviewSrc={setWebviewSrc}
                        selected={selected}
                        hovered={hovered}
                    />
                    <WebviewTag selected={selected} metadata={metadata} webviewRef={webviewRef} />
                </div>
                <GestureScreen webviewRef={webviewRef} setHovered={setHovered} />
            </div>
        );
    },
);

export default Webview;
