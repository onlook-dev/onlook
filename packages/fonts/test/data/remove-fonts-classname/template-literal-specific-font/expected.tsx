import React from 'react';
const inter = {
  variable: 'inter-variable'
};
const roboto = {
  variable: 'roboto-variable'
};
export function Component() {
  return <div className={`${roboto.variable} text-lg`} />;
}