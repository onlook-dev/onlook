import React from 'react';

const inter = { variable: 'inter-variable' };
const roboto = { variable: 'roboto-variable' };
const montserrat = { variable: 'montserrat-variable' };

export function Component() {
    return (
        <div
            className={`${inter.variable} text-lg ${roboto.variable} bg-blue-500 ${montserrat.variable}`}
        />
    );
}
