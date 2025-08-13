import React from 'react';

const inter = { variable: 'inter-variable' };
const isActive = true;

export function Component() {
    return (
        <div
            className={`${inter.variable} text-lg ${isActive ? 'font-bold' : 'font-normal'} bg-blue-500`}
        />
    );
}
