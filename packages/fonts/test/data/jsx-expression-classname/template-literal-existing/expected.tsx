import React from 'react';
const inter = {
    variable: 'inter-variable',
};
export function Component({ isActive }: { isActive: boolean }) {
    return <div className={`bg-blue-500 ${isActive ? 'active' : 'inactive'} ${inter.variable}`} />;
}
