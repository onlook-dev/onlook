import React from 'react';
const inter = {
  variable: 'inter-variable'
};
const isActive = true;
export function Component() {
  return <div className={`text-lg ${isActive ? 'font-bold' : 'font-normal'} bg-blue-500`} />;
}