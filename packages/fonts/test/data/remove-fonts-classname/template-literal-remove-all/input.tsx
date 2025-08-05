import React from 'react';

const inter = { variable: 'inter-variable' };
const roboto = { variable: 'roboto-variable' };

export function Component() {
    return <div className={`${inter.variable} ${roboto.variable} text-lg bg-blue-500`} />;
}
