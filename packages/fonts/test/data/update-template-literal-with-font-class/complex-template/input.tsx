import React from 'react';

export function Component() {
    return <div className={`bg-blue-500 ${isActive ? 'text-white' : 'text-gray-500'} ${dynamicClass} hover:bg-blue-600`} />;
} 