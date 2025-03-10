// Import WebviewChannels enum
const WebviewChannels = {
    INIT_BRIDGE: 'init-bridge',
    EXECUTE_JS: 'execute-js'
};

/**
 * Injects the iframe bridge script into the iframe's content document
 * This allows for communication between the iframe and the parent window
 */
export const injectIframeBridge = (iframe: HTMLIFrameElement): void => {
    iframe.addEventListener('load', () => {
        try {
            // Only inject if we have access to the contentDocument
            if (!iframe.contentDocument || !iframe.contentWindow) {
                console.warn('Cannot access iframe contentDocument to inject bridge');
                return;
            }
            
            // Check if the bridge script is already injected
            if (iframe.contentWindow.hasOwnProperty('_onlookBridgeInjected')) {
                return;
            }
            
            // Create and append the bridge script
            const script = document.createElement('script');
            script.src = '/iframe-bridge.js';
            script.onload = () => {
                // Initialize the bridge after it's loaded
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        channel: WebviewChannels.INIT_BRIDGE,
                        args: { id: iframe.id }
                    }, '*');
                    
                    // Mark as injected to prevent duplicate injections
                    (iframe.contentWindow as any)._onlookBridgeInjected = true;
                }
            };
            
            // Append to head if available, otherwise to body or document
            const target = iframe.contentDocument.head || 
                           iframe.contentDocument.body || 
                           iframe.contentDocument;
            target.appendChild(script);
        } catch (error) {
            console.error('Error injecting iframe bridge:', error);
        }
    });
};
