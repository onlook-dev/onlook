import React, { useRef } from 'react';

function FrameList() {
    const webviewRef = useRef(null);
    return (
        <webview ref={webviewRef} className='w-[96rem] h-[54rem]' src="https://www.framer.com/" ></webview>
    );
}

export default FrameList;
