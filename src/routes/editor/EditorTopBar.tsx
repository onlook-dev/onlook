import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import React from 'react';

const EditorTopBar = () => {
    return (
        <div className='flex flex-row'>
            <Button variant='ghost' size="sm" className=''><ArrowLeftIcon className='mr-2' /> Dashboard</Button>
        </div>
    );
};
export default EditorTopBar;
