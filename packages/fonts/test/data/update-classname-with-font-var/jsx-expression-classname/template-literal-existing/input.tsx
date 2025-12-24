import React from 'react';

export function Component({ isActive }: { isActive: boolean }) {
    return <div className={`bg-blue-500 ${isActive ? 'active' : 'inactive'}`} />;
}
