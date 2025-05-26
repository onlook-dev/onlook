"use client";

export const listenForEvents = () => {
    console.log('listening for events');
    window.addEventListener('error', (event) => {
        console.error('xxxiframe inside iframe', event);
    });

    // In iframe code
    window.addEventListener('error', e => {
        console.error('xxxiframe inside iframe', e);
    });

    window.addEventListener('unhandledrejection', e => {
        console.error('xxxiframe rejection inside iframe', e);
    });
};