import React, { useRef } from 'react';

function FrameList() {
    const webviewRef = useRef(null);
    return (
        <webview ref={webviewRef} className='w-[100rem] h-[70rem]' src="https://www.framer.com/" ></webview>
    );
}

export default FrameList;
