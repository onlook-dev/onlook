import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { CodeIcon } from '@radix-ui/react-icons';
import SharePopover from './SharePopver';

const EditorTopBar = () => {
    return (
        <div className='flex flex-row h-10 p-2 justify-center items-center border-b border-b-stone-800'>
            <div className='flex-grow basis-0'>
                <Button variant='outline' size="sm" className=''><CodeIcon className='mr-2' /> Code block</Button>
            </div>
            <Label className='my-auto font-normal'>Your Project</Label>
            <div className='flex space-x-2 flex-grow basis-0 justify-end'>
                <SharePopover />
                <Button variant='outline' size="sm" className=''>Publish</Button>
            </div>
        </div>
    );
};

export default EditorTopBar;
