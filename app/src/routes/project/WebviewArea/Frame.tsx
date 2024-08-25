import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';

import { Button } from '@/components/ui/button';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';
import BrowserControls from './BrowserControl';
import GestureScreen from './GestureScreen';
import ResizeHandles from './ResizeHandles';
import { Links } from '/common/constants';

const Webview = observer(
    ({
        messageBridge,
        metadata,
    }: {
        messageBridge: WebviewMessageBridge;
        metadata: WebviewMetadata;
    }) => {
        const webviewRef = useRef<Electron.WebviewTag>(null);
        const editorEngine = useEditorEngine();
        const [webviewSrc, setWebviewSrc] = useState<string>(metadata.src);
        const [selected, setSelected] = useState<boolean>(false);
        const [hovered, setHovered] = useState<boolean>(false);
        const [webviewSize, setWebviewSize] = useState({ width: 1536, height: 960 });
        const [domFailed, setDomFailed] = useState(false);
        const [onlookEnabled, setOnlookEnabled] = useState(false);

        const RETRY_TIMEOUT = 3000;

        useEffect(setupFrame, [webviewRef]);
        useEffect(
            () => setSelected(editorEngine.webviews.isSelected(metadata.id)),
            [editorEngine.webviews.webviews],
        );

        function setupFrame() {
            const webview = webviewRef.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }
            editorEngine.webviews.register(webview);
            messageBridge.register(webview, metadata);
            setBrowserEventListeners(webview);

            return () => {
                editorEngine.webviews.deregister(webview);
                messageBridge.deregister(webview);
                webview.removeEventListener('did-navigate', handleUrlChange);
            };
        }

        function setBrowserEventListeners(webview: Electron.WebviewTag) {
            webview.addEventListener('did-navigate', handleUrlChange);
            webview.addEventListener('did-navigate-in-page', handleUrlChange);
            webview.addEventListener('dom-ready', handleDomReady);
            webview.addEventListener('did-fail-load', handleDomFailed);
        }

        function handleUrlChange(e: any) {
            setWebviewSrc(e.url);
            editorEngine.clear();
        }

        async function handleDomReady() {
            const webview = webviewRef.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }
            webview.setZoomLevel(0);
            const body = await editorEngine.dom.getBodyFromWebview(webview);
            editorEngine.dom.setDom(metadata.id, body);
            setDomFailed(body.children.length === 0);
            checkForOnlookEnabled(body);
        }

        function checkForOnlookEnabled(body: Element) {
            const doc = body.ownerDocument;
            const attributeExists = doc.evaluate(
                '//*[@data-onlook-id]',
                doc,
                null,
                XPathResult.BOOLEAN_TYPE,
                null,
            ).booleanValue;
            setOnlookEnabled(attributeExists);
        }

        function handleDomFailed() {
            setDomFailed(true);
            setTimeout(() => {
                const webview = webviewRef.current as Electron.WebviewTag | null;
                if (webview) {
                    webview.reload();
                }
            }, RETRY_TIMEOUT);
        }

        return (
            <div className="flex flex-col space-y-4">
                <BrowserControls
                    webviewRef={webviewRef}
                    webviewSrc={webviewSrc}
                    setWebviewSrc={setWebviewSrc}
                    selected={selected}
                    hovered={hovered}
                    setHovered={setHovered}
                    onlookEnabled={onlookEnabled}
                />
                <div className="relative">
                    <ResizeHandles
                        webviewRef={webviewRef}
                        webviewSize={webviewSize}
                        setWebviewSize={setWebviewSize}
                    />
                    <webview
                        id={metadata.id}
                        ref={webviewRef}
                        className="w-[96rem] h-[60rem] bg-black/10 backdrop-blur-sm transition"
                        src={metadata.src}
                        preload={`file://${window.env.WEBVIEW_PRELOAD_PATH}`}
                        allowpopups={'true' as any}
                        style={{ width: webviewSize.width, height: webviewSize.height }}
                    ></webview>
                    <GestureScreen webviewRef={webviewRef} setHovered={setHovered} />
                    {domFailed && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-gray-200/40 via-gray-500/40 to-gray-600/40 border-gray-500 border-[0.5px] space-y-4 rounded-xl">
                            <p className="text-active text-title1">
                                Run your React app to start editing
                            </p>
                            <p className="text-text text-title2 text-center">
                                {"Make sure Onlook is installed on your app with 'npx onlook'"}
                            </p>
                            <Button
                                variant={'link'}
                                size={'lg'}
                                className="text-title2"
                                onClick={() => {
                                    window.open(Links.USAGE_DOCS, '_blank');
                                }}
                            >
                                Read the get started guide
                                <ExternalLinkIcon className="ml-2 w-6 h-6" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    },
);

export default Webview;
