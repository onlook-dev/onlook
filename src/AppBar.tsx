import { HomeIcon, PlusIcon } from '@radix-ui/react-icons';
import React from 'react';

function AppBar() {
  const height = 'h-9';
  return (
    <div className={`appbar flex items-center pl-20 border-b ${height}`}>
      <div className={`w-10 flex items-center justify-center hover:opacity-80 ${height}`}><HomeIcon /></div>
      <div className={`min-w-40 max-w-52 border border-b-black px-4 rounded-t-lg text-xs flex items-center h-[37px]`}>
        <h1 className="text-bold">Current Tab</h1>
      </div>
      <div className={`w-10 flex items-center justify-center hover:opacity-80 ${height}`}><PlusIcon /></div>

    </div>
  );
}

export default AppBar;
