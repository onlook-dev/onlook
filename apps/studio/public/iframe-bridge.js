// This script will be loaded by the iframe to establish communication
(function() {
    // Create a compatibility layer for the window.api object
    const api = {
        // Common API methods that match the Electron webview preload API
        setWebviewId: (id) => {
            window._webviewId = id;
        },
        
        processDom: () => {
            // Process the DOM and notify the parent
            _sendToHost('dom-processed');
        },
        
        getFirstOnlookElement: () => {
            // Find the first element with data-onlook attribute
            const elements = document.querySelectorAll('[data-onlook]');
            if (elements.length > 0) {
                const el = elements[0];
                return {
                    id: el.id,
                    tagName: el.tagName,
                    attributes: getElementAttributes(el)
                };
            }
            return null;
        },
        
        getTheme: () => {
            // Check if the document has a dark mode class or attribute
            const isDark = document.documentElement.classList.contains('dark') || 
                          document.body.classList.contains('dark') ||
                          document.documentElement.getAttribute('data-theme') === 'dark';
            return isDark ? 'dark' : 'light';
        }
    };
    
    // Function to get element attributes
    function getElementAttributes(element) {
        const attributes = {};
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            attributes[attr.name] = attr.value;
        }
        return attributes;
    }
    
    // Function to send messages back to the parent
    const _sendToHost = (channel, ...args) => {
        window.parent.postMessage({
            channel,
            args: args.length > 0 ? args[0] : undefined
        }, '*');
    };
    
    // Listen for messages from the parent
    window.addEventListener('message', (event) => {
        // Only accept messages from our parent
        if (event.source !== window.parent) {
            return;
        }
        
        const { channel, args } = event.data;
        if (!channel) {return;}
        
        // Special handling for JavaScript execution
        if (channel === 'execute-js') {
            try {
                const result = eval(args.code);
                window.parent.postMessage({
                    messageId: args.messageId,
                    result
                }, '*');
            } catch (error) {
                window.parent.postMessage({
                    messageId: args.messageId,
                    error: error.toString()
                }, '*');
            }
            return;
        }
        
        // Dispatch to appropriate handler
        if (handlers[channel]) {
            handlers[channel](args);
        }
    });
    
    // Handler map for incoming messages
    const handlers = {
        'init-bridge': (args) => {
            if (args && args.id) {
                api.setWebviewId(args.id);
            }
            // Notify parent that bridge is initialized
            _sendToHost('bridge-initialized');
        }
    };
    
    // Handle navigation events
    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        _sendToHost('did-navigate', { url: window.location.href });
    };
    
    window.addEventListener('popstate', () => {
        _sendToHost('did-navigate', { url: window.location.href });
    });
    
    // Expose the API to the window
    window.api = api;
    
    // Expose sendToHost for internal use
    window._sendToHost = _sendToHost;
    
    // Notify parent that the script has loaded
    _sendToHost('bridge-loaded');
})();
