import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import React from 'react';

const EditorTopBar = () => {
    return (
        <div className='flex flex-row w-full h-full justify-center'>
            <Button variant='ghost' size="sm" className=''>Actions</Button>
            <Label className='m-auto font-normal'>Your Project</Label>
            <div className='mx-1 space-x-2'>
                <Button variant='ghost' size="sm" className=''>Share</Button>
                <Button variant='outline' size="sm" className=''>Publish</Button>
            </div>

        </div>
    );
};
export default EditorTopBar;
