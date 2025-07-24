import React from 'react';
const inter = {
    variable: 'inter-variable',
};
const styles = 'bg-blue-500 text-white';
export function Component() {
    return <div className={`${inter.variable} ${styles}`} />;
}
