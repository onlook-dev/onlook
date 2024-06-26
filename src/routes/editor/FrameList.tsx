import React, { useEffect, useRef } from 'react';

function FrameList() {
    const webviewRef = useRef(null);

    useEffect(() => {
        const webview = webviewRef.current;
        if (webview) {
            // Add event listeners
            webview.addEventListener('mouseover', handleMouseOver);
            webview.addEventListener('mouseout', handleMouseOut);
            webview.addEventListener('click', handleClick);
        }

        // Cleanup function to remove event listeners
        return () => {
            if (webview) {
                webview.removeEventListener('mouseover', handleMouseOver);
                webview.removeEventListener('mouseout', handleMouseOut);
                webview.removeEventListener('click', handleClick);
            }
        };
    }, []);

    const handleMouseOver = () => {
        console.log('Mouse over the webview');
    };

    const handleMouseOut = () => {
        console.log('Mouse out of the webview');
    };

    const handleClick = () => {
        console.log('Webview clicked');
    };

    return (
        <webview ref={webviewRef} className='w-[100rem] h-[100rem]' src="https://www.framer.com/" ></webview>
    );
}

export default FrameList;
